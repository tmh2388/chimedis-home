// P0 Translate Engine v2 — Cohort A runner: production synthetic Discovery probes.
//
// Đọc pack JSONL (scripts/generate-shadow-traffic-pack-v1.mjs), gửi các case mode=discovery
// tới endpoint PUBLIC /api/research/search trong khi production đang ở TRANSLATE_ENGINE=shadow.
// KHÔNG sửa app/dictionary/env/schema. KHÔNG auth. Chỉ đọc dữ liệu.
//
// Chạy:
//   node scripts/shadow-synthetic-run.mjs --pack /tmp/translation-shadow-traffic-pack-v1.jsonl \
//        --out docs/translation-shadow-p0-synthetic-run-v1.jsonl
// Cờ:
//   --dry-run       chỉ kiểm pack + in kế hoạch, KHÔNG gửi request
//   --smoke N       chỉ gửi N request đầu (kiểm kết nối), rồi dừng
//   --limit N       giới hạn tổng số request (mặc định: tất cả case discovery)
//   --base URL      base URL (mặc định https://chimedis.vn)
//   --concurrency N 1 hoặc 2 (mặc định 1 — nhẹ nhất, khuyến nghị)
//
// Raw output: 1 dòng JSON / case, kèm 1 dòng _meta ở đầu (run-start) và cuối (run-end).
// Ghi ngay từng dòng để tiến độ sống sót nếu bị ngắt.

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, def = null) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const PACK = opt('--pack', '/tmp/translation-shadow-traffic-pack-v1.jsonl');
const OUT = opt('--out', 'docs/translation-shadow-p0-synthetic-run-v1.jsonl');
const BASE = String(opt('--base', 'https://chimedis.vn')).replace(/\/$/, '');
const DRY = args.includes('--dry-run');
const SMOKE = opt('--smoke', null) ? parseInt(opt('--smoke'), 10) : null;
const LIMIT = opt('--limit', null) ? parseInt(opt('--limit'), 10) : null;
const CONCURRENCY = Math.min(2, Math.max(1, parseInt(opt('--concurrency', '1'), 10) || 1));
const UA = 'chimedis-p0-synthetic-v1';
const REQ_TIMEOUT_MS = 45000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () => 2000 + Math.floor(Math.random() * 3000); // 2–5s
const nowIso = () => new Date().toISOString();

let gitCommit = 'unknown';
try { gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { /* noop */ }

// ---- load pack ----
if (!fs.existsSync(PACK)) {
  console.error(`Pack không tồn tại: ${PACK}\nChạy: node scripts/generate-shadow-traffic-pack-v1.mjs > ${PACK}`);
  process.exit(1);
}
const all = fs.readFileSync(PACK, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
let discovery = all.filter((r) => r.mode === 'discovery');
if (LIMIT) discovery = discovery.slice(0, LIMIT);
if (SMOKE) discovery = discovery.slice(0, SMOKE);

console.error(`[plan] pack=${PACK} rows=${all.length} discovery=${all.filter((r) => r.mode === 'discovery').length}`
  + ` → sẽ gửi ${discovery.length}  base=${BASE}  concurrency=${CONCURRENCY}  ua=${UA}  commit=${gitCommit.slice(0, 8)}`);
console.error(`[plan] out=${OUT}`);

if (DRY) {
  console.error('[dry-run] 5 URL mẫu:');
  for (const r of discovery.slice(0, 5)) {
    console.error(`  ${r.synthetic_case_id} [${r.category}]  ${BASE}/api/research/search?q=${encodeURIComponent(r.input)}`);
  }
  const cats = {};
  for (const r of discovery) cats[r.category] = (cats[r.category] || 0) + 1;
  console.error('[dry-run] discovery theo category:', JSON.stringify(cats));
  console.error('[dry-run] KHÔNG gửi request. Bỏ --dry-run để chạy thật.');
  process.exit(0);
}

// ---- output stream ----
const outStream = fs.createWriteStream(OUT, { flags: 'w' });
const writeLine = (obj) => outStream.write(JSON.stringify(obj) + '\n');

const started_at = nowIso();
writeLine({
  _meta: 'run-start', cohort: 'A-production-discovery', started_at, base: BASE,
  pack: PACK, git_commit: gitCommit, user_agent: UA, concurrency: CONCURRENCY,
  planned_requests: discovery.length,
});
console.error(`[start] ${started_at}  ${discovery.length} request`);

// ---- runtime guards ----
let consecInfraFail = 0;
let aborted = false;
let abortReason = null;
const latWindow = [];
const RETRY_STATUS = new Set([429, 502, 503, 504]);

async function doRequest(r, requestIndex) {
  const url = `${BASE}/api/research/search?q=${encodeURIComponent(r.input)}`;
  let attempt = 0;
  let lastErr = null;
  while (attempt < 2) { // tối đa 1 retry
    attempt++;
    const ts_start = nowIso();
    const t0 = Date.now();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REQ_TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ac.signal });
      clearTimeout(timer);
      const latency_ms = Date.now() - t0;
      let body = null;
      const text = await res.text();
      try { body = JSON.parse(text); } catch { /* keep null */ }

      if (RETRY_STATUS.has(res.status) && attempt < 2) {
        lastErr = `http ${res.status}`;
        const backoff = 8000 + Math.floor(Math.random() * 4000);
        console.error(`  [retry] ${r.synthetic_case_id} http ${res.status} → chờ ${backoff}ms`);
        await sleep(backoff);
        continue;
      }

      const ok = res.status === 200 && body && body.success !== false;
      const infra = RETRY_STATUS.has(res.status) || res.status >= 500;
      const rec = {
        synthetic_case_id: r.synthetic_case_id, batch: r.batch, category: r.category, mode: r.mode,
        input: r.input, request_index: requestIndex, attempt_count: attempt,
        ts_start, ts_end: nowIso(), latency_ms, http_status: res.status, ok, infra_fail: !!infra,
        cached: !!(body && body.cached),
        effective_query: body?.query?.effective ?? null,
        expansion_terms: body?.expansion?.terms ?? null,
        warning: body?.warning ?? null,
        count: body?.count ?? null,
        total_by_source: body?.totalBySource ?? null,
        source_errors: body?.sourceErrors ?? null,
        error: ok ? null : (body?.error || `http ${res.status}`),
      };
      return rec;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e.name === 'AbortError' ? `timeout ${REQ_TIMEOUT_MS}ms` : (e.message || String(e));
      if (attempt < 2) {
        const backoff = 8000 + Math.floor(Math.random() * 4000);
        console.error(`  [retry] ${r.synthetic_case_id} ${lastErr} → chờ ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
    }
  }
  return {
    synthetic_case_id: r.synthetic_case_id, batch: r.batch, category: r.category, mode: r.mode,
    input: r.input, request_index: requestIndex, attempt_count: 2,
    ts_start: nowIso(), ts_end: nowIso(), latency_ms: null, http_status: null, ok: false,
    infra_fail: true, cached: false, effective_query: null, expansion_terms: null, warning: null,
    count: null, total_by_source: null, source_errors: null, error: lastErr || 'unknown',
  };
}

function checkGuards(rec) {
  if (rec.infra_fail || !rec.ok) consecInfraFail++;
  else consecInfraFail = 0;
  if (rec.latency_ms != null) {
    latWindow.push(rec.latency_ms);
    if (latWindow.length > 10) latWindow.shift();
  }
  if (consecInfraFail >= 5) { aborted = true; abortReason = `5 lỗi hạ tầng liên tiếp (case cuối ${rec.synthetic_case_id})`; }
  const avg = latWindow.length >= 10 ? latWindow.reduce((a, b) => a + b, 0) / latWindow.length : 0;
  if (avg > 25000) { aborted = true; abortReason = `latency trung bình 10 request gần nhất = ${Math.round(avg)}ms > 25000ms`; }
}

let completed = 0;
let infraFailures = 0;

async function worker(queue) {
  while (queue.length && !aborted) {
    const { r, idx } = queue.shift();
    const rec = await doRequest(r, idx);
    writeLine(rec);
    completed++;
    if (!rec.ok) infraFailures++;
    checkGuards(rec);
    const tag = rec.ok ? `ok ${rec.http_status} ${rec.latency_ms}ms${rec.cached ? ' cached' : ''}` : `FAIL ${rec.error}`;
    console.error(`[${String(completed).padStart(3)}/${discovery.length}] ${rec.synthetic_case_id} [${rec.category}] ${tag}`);
    if (aborted) break;
    if (queue.length) await sleep(jitter());
  }
}

const queue = discovery.map((r, i) => ({ r, idx: i + 1 }));
const workers = [];
// concurrency: chia queue; mỗi worker tự jitter → tổng RPS ~ concurrency / 3.5s
for (let i = 0; i < CONCURRENCY; i++) workers.push(worker(queue));
await Promise.all(workers);

const ended_at = nowIso();
writeLine({
  _meta: 'run-end', cohort: 'A-production-discovery', started_at, ended_at,
  planned_requests: discovery.length, completed, infra_failures: infraFailures,
  aborted, abort_reason: abortReason,
});
outStream.end();

const meta = {
  cohort: 'A-production-discovery', started_at, ended_at, base: BASE, git_commit: gitCommit,
  user_agent: UA, planned_requests: discovery.length, completed, infra_failures: infraFailures,
  aborted, abort_reason: abortReason, out: OUT,
};
fs.writeFileSync(OUT.replace(/\.jsonl$/, '.meta.json'), JSON.stringify(meta, null, 2) + '\n');

console.error(`\n[done] started_at=${started_at}`);
console.error(`[done] ended_at=${ended_at}`);
console.error(`[done] completed=${completed}/${discovery.length}  infra_failures=${infraFailures}  aborted=${aborted}${abortReason ? ' — ' + abortReason : ''}`);
console.error(`[done] raw: ${OUT}`);
console.error(`[done] meta: ${OUT.replace(/\.jsonl$/, '.meta.json')}`);
