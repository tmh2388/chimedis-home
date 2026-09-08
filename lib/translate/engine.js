// Milestone D — Engine dịch truy vấn 4 tầng. docs/translation-engine.md §5.
// GIỮ NGUYÊN DẤU làm khoá tra chính. Fold chỉ để Tầng 2 sinh ứng viên (có mức phạt).
//
// translate(rawQuery, { mode, pinnedTerms, indexes }) -> {
//   engine_version, script, normalized,
//   spans: [{ text, decision, stage, conceptId?, en?, confidence?, transform?, candidates? }],
//   effective_query,     // Discovery GIỮ span unresolved/ambiguous nguyên văn
//   translated: [{ from, to, confidence, note? }],
//   disambiguation: [{ text, options }],
//   unresolved: [ text ],
//   needs_resolution,    // true nếu mode=evidence còn span ambiguous/unresolved
//   warning
// }

import { normalizeInput, foldDiacritics, cjkRuns } from './normalize.js';
import { trustCeiling } from './concepts.js';

export const ENGINE_VERSION = 'te-v2-d1';

const CONF_RANK = { high: 3, medium: 2, low: 1, none: 0 };
const minConf = (a, b) => (CONF_RANK[a] <= CONF_RANK[b] ? a : b);

const TYPO_FIX = [
  [/aa/g, 'â'], [/ee/g, 'ê'], [/oo/g, 'ô'],
  [/aw/g, 'ă'], [/ow/g, 'ơ'], [/uw/g, 'ư'],
  [/dd/g, 'đ'],
];
function applyTypoFix(tok) {
  let t = tok;
  for (const [re, rep] of TYPO_FIX) t = t.replace(re, rep);
  return t === tok ? null : t;
}

const distinctRoots = (ids, idx) => new Set(ids.map((id) => idx.root.get(id) || id));
const optionList = (ids, idx) =>
  [...new Set(ids)].map((id) => {
    const c = idx.byId.get(id);
    return { conceptId: id, en: c?.en, clinical: !!c?.clinical };
  });

function translatedSpan(id, idx, matchConf, stage, transform) {
  const c = idx.byId.get(id);
  return {
    decision: 'translate', stage, transform,
    conceptId: id, en: c.en, en_synonyms: c.en_synonyms || [],
    match_confidence: matchConf,
    confidence: minConf(matchConf, trustCeiling(c)),
    needs_review: minConf(matchConf, trustCeiling(c)) !== 'high',
  };
}

// ---------- CJK: phân đoạn tham lam theo EXACT_ZH ----------
function segmentCjk(run, idx) {
  const out = [];
  let i = 0;
  const s = run;
  while (i < s.length) {
    let matched = null;
    for (let len = Math.min(8, s.length - i); len >= 1; len--) {
      const sub = s.slice(i, i + len);
      const ids = idx.EXACT_ZH.get(sub);
      if (ids && ids.length) { matched = { sub, ids: [...new Set(ids)] }; break; }
    }
    if (matched) {
      const roots = distinctRoots(matched.ids, idx);
      if (roots.size === 1) out.push({ text: matched.sub, ...translatedSpan(matched.ids[0], idx, 'high', '1-zh') });
      else out.push({ text: matched.sub, decision: 'ambiguous', stage: '1-zh', candidates: matched.ids });
      i += matched.sub.length;
    } else {
      // gom các ký tự Hán chưa khớp liền nhau thành 1 span unresolved
      let j = i;
      while (j < s.length) {
        let hit = false;
        for (let len = Math.min(8, s.length - j); len >= 1; len--) {
          if (idx.EXACT_ZH.has(s.slice(j, j + len))) { hit = true; break; }
        }
        if (hit) break;
        j++;
      }
      out.push({ text: s.slice(i, j), decision: 'unresolved', stage: '1-zh' });
      i = j;
    }
  }
  return out;
}

// ---------- Latin: Tầng 1 exact n-gram + Tầng 2 folded n-gram ----------
function matchLatin(tokens, idx, pinnedTerms) {
  const n = tokens.length;
  const taken = new Array(n).fill(false);
  const spans = [];

  // pinned trước tiên (đúng token)
  for (let i = 0; i < n; i++) {
    const pin = pinnedTerms[tokens[i]] || pinnedTerms[foldDiacritics(tokens[i])];
    if (pin && idx.byId.get(pin)) {
      spans.push({ i, size: 1, text: tokens[i], ...translatedSpan(pin, idx, 'high', 'pinned') });
      taken[i] = true;
    }
  }

  // Tầng 1 — exact theo dấu, dài trước ngắn (cụm YHCT dài nhất ~8 từ:
  // "thử nghiệm lâm sàng ngẫu nhiên có đối chứng")
  for (let size = Math.min(8, n); size >= 1; size--) {
    for (let i = 0; i + size <= n; i++) {
      if (taken.slice(i, i + size).some(Boolean)) continue;
      const phrase = tokens.slice(i, i + size).join(' ');
      const ids = [...(idx.EXACT_VI.get(phrase) || []), ...(idx.EXACT_PY.get(phrase) || [])];
      if (!ids.length) continue;
      for (let k = i; k < i + size; k++) taken[k] = true;
      const folded = foldDiacritics(phrase);
      // Khớp CHÍNH XÁC nhưng bản thân cụm KHÔNG có dấu tiếng Việt và folded ∈ COLLISION_SET
      // ⇒ người dùng chưa phân biệt bằng dấu → vẫn AMBIGUOUS (review#3). Gộp mọi nghĩa cùng folded.
      const tonelessCollision = folded === phrase && idx.COLLISION_SET.has(folded);
      const allIds = tonelessCollision
        ? [...new Set([...ids, ...(idx.FOLDED_VI.get(folded) || [])])]
        : [...new Set(ids)];
      const roots = distinctRoots(allIds, idx);
      if (roots.size === 1 && !tonelessCollision) {
        spans.push({ i, size, text: phrase, ...translatedSpan(ids[0], idx, 'high', '1-vi') });
      } else {
        spans.push({ i, size, text: phrase, decision: 'ambiguous', stage: 1,
          reason: tonelessCollision ? 'toneless-collision' : 'exact-multi', candidates: allIds });
      }
    }
  }

  // Tầng 2 — folded n-gram cho span còn trống (dài trước ngắn), cùng trần 8 từ như Tầng 1
  for (let size = Math.min(8, n); size >= 1; size--) {
    for (let i = 0; i + size <= n; i++) {
      if (taken.slice(i, i + size).some(Boolean)) continue;
      const phrase = tokens.slice(i, i + size).join(' ');
      const folded = foldDiacritics(phrase);
      if (idx.COLLISION_SET.has(folded)) {
        for (let k = i; k < i + size; k++) taken[k] = true;
        spans.push({ i, size, text: phrase, decision: 'ambiguous', stage: 2, reason: 'collision',
          candidates: [...new Set(idx.FOLDED_VI.get(folded) || [])], transform: 'fold' });
        continue;
      }
      const fIds = idx.FOLDED_VI.get(folded) || idx.FOLDED_PY.get(folded) || [];
      if (fIds.length) {
        for (let k = i; k < i + size; k++) taken[k] = true;
        const roots = distinctRoots(fIds, idx);
        if (roots.size >= 2) {
          spans.push({ i, size, text: phrase, decision: 'ambiguous', stage: 2, reason: 'fold-multi',
            candidates: [...new Set(fIds)], transform: 'fold' });
        } else {
          spans.push({ i, size, text: phrase, ...translatedSpan(fIds[0], idx, 'medium', '2a-fold') });
        }
        continue;
      }
      // Tầng 2c — lỗi gõ Telex (chỉ 1 từ)
      if (size === 1) {
        const fixed = applyTypoFix(phrase);
        if (fixed && fixed !== phrase) {
          const ids = idx.EXACT_VI.get(fixed) || [];
          if (ids.length === 1) {
            taken[i] = true;
            spans.push({ i, size: 1, text: phrase, ...translatedSpan(ids[0], idx, 'low', '2c-typo') });
          }
        }
      }
    }
  }

  // token còn trống → unresolved (giữ nguyên văn)
  for (let i = 0; i < n; i++) {
    if (taken[i]) continue;
    spans.push({ i, size: 1, text: tokens[i], decision: 'unresolved', stage: 2 });
    taken[i] = true;
  }

  return spans.sort((a, b) => a.i - b.i);
}

// D8 (2026-09-08): port danh sách hư từ + cụm-đệm-y-văn của legacy vào engine v2.
// Trong Discovery, cụm `unresolved` mà TOÀN BỘ token thuộc VI_STOP → BỎ khỏi effective_query
// (rác cho PubMed). Cụm còn ≥1 token "có nghĩa" → giữ nguyên văn + đưa vào unresolved[] +
// cảnh báo (để LLM D6 / người dùng xử lý). Evidence: mọi unresolved vẫn chặn (needs_resolution).
// LƯU Ý: KHÔNG đưa hình vị trùng thuật ngữ thật vào đây (cứu, giả, châm, phong...).
const VI_STOP = new Set([
  // hư từ ngữ pháp
  'va', 'voi', 'cua', 'trong', 'ngoai', 'sau', 'truoc', 'khi', 'cho', 'la', 'co', 'khong',
  'bang', 'de', 've', 'tren', 'duoi', 'hay', 'hoac', 'nhung', 'cac', 'mot', 'nhieu', 'do',
  'boi', 'tai', 'nhu', 'den', 'tu', 'theo', 'nham', 'giua', 'moi', 'nao', 'gi', 'ma', 'thi',
  'se', 'da', 'dang', 'bi', 'duoc', 'nay', 'day', 'kia', 'o', 'noi', 'khac', 'cung', 'van',
  // cụm-đệm y văn — mỗi âm tiết của các cụm legacy coi là "generic". Chỉ gồm từ mà đứng
  // RIÊNG gần như luôn là đệm (không ghép thành thuật ngữ bệnh/thuốc/huyệt).
  'tac', 'dung', 'tac dung', 'hieu', 'hieu qua', 'ket', 'ket hop', 'phoi hop',
  'dieu', 'dieu tri', 'chua', 'nghien', 'nghien cuu', 'danh gia', 'khao sat',
  'anh huong', 'vai', 'vai tro', 'phuong phap', 'thu nghiem', 'tong quan', 'phan tich',
  'quan sat', 'lieu trinh', 'kha nang', 'moi lien', 'cai', 'thien', 'cai thien',
  'so sanh', 'so', 'sanh', 'ung dung', 'su dung', 'tang cuong', 'ho tro',
  'benh', 'nhan', 'benh nhan', 'nguoi benh', 'tip', 'typ',
  'muc do', 'ty le', 'ti le', 'thoi gian', 'giai doan', 'nhom chung',
  'that', 'lien quan', 'moi lien quan', 'bao cao', 'ca lam sang',
  'nghiem', 'ngau', 'nhien', 'ngau nhien', 'doi chung',
]);

// Nhãn tiếng Anh coi là "generic" — cắt khi đã có ≥3 khái niệm cụ thể (port từ legacy).
const GENERIC_EN = new Set([
  'treatment', 'therapy', 'therapeutic', 'management', 'efficacy', 'effectiveness',
  'clinical efficacy', 'therapeutic effect', 'clinical', 'clinical study', 'clinical trial',
  'randomized controlled trial', 'trial', 'study', 'research', 'review', 'systematic review',
  'meta-analysis', 'mechanism', 'combined therapy', 'combination therapy', 'adjunctive therapy',
  'combined', 'diagnosis', 'prognosis', 'observation', 'analysis', 'syndrome', 'disease',
  'treatment course', 'safety', 'evaluation', 'assessment', 'clinical observation',
  'combined treatment', 'course of treatment',
]);

// Hư từ / liên từ chữ Hán — bỏ khỏi effective_query khi không khớp concept (rác cho PubMed).
// KHÔNG gồm 慢性/急性 (mạn/cấp — có nghĩa lâm sàng, nên là concept).
const HAN_STOP = new Set([...'的了和與与及在對对於于並并後后前中以為为者之與治疗治療與联合聯合联用比较比較观察觀察研究评价評價疗效療效作用影响影響用于臨床临床']);
function stripHanStop(s) {
  return [...String(s)].filter((ch) => !HAN_STOP.has(ch)).join('').trim();
}

export function translate(rawQuery, { mode = 'discovery', pinnedTerms = {}, indexes } = {}) {
  if (!indexes) throw new Error('translate(): thiếu indexes');
  const norm = normalizeInput(rawQuery);

  // Chia normalized thành đoạn CJK và đoạn Latin theo vị trí
  const segments = [];
  const runs = cjkRuns(norm.normalized);
  let cursor = 0;
  for (const run of runs) {
    if (run.start > cursor) segments.push({ type: 'latin', text: norm.normalized.slice(cursor, run.start).trim() });
    segments.push({ type: 'cjk', text: run.text });
    cursor = run.start + run.text.length;
  }
  if (cursor < norm.normalized.length) segments.push({ type: 'latin', text: norm.normalized.slice(cursor).trim() });
  if (!runs.length) segments.length = 0, segments.push({ type: 'latin', text: norm.normalized });

  const allSpans = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    if (seg.type === 'cjk') {
      allSpans.push(...segmentCjk(seg.text, indexes));
    } else {
      const toks = seg.text.split(/\s+/).filter(Boolean);
      allSpans.push(...matchLatin(toks, indexes, pinnedTerms));
    }
  }

  // ---- ghép effective_query + gom kết quả ----
  const translated = [];
  const disambiguation = [];
  const unresolved = [];
  const outParts = [];

  // gộp các span `unresolved` liền kề thành 1 cụm (để xét theo cụm + theo token)
  const merged = [];
  for (const s of allSpans) {
    const last = merged[merged.length - 1];
    if (s.decision === 'unresolved' && last && last.decision === 'unresolved') {
      last.text += ' ' + s.text;
    } else {
      merged.push({ ...s });
    }
  }

  const isFiller = (tok) => VI_STOP.has(foldDiacritics(tok));

  for (const s of merged) {
    if (s.decision === 'translate') {
      const alts = (s.en_synonyms || []).filter(Boolean).slice(0, 4);
      const grp = alts.length
        ? `(${['"' + s.en + '"', ...alts.map((a) => '"' + a + '"')].join(' OR ')})`
        : `"${s.en}"`;
      outParts.push({ q: grp, generic: GENERIC_EN.has(String(s.en).trim().toLowerCase()) });
      translated.push({ from: s.text, to: s.en, confidence: s.confidence,
        note: s.needs_review ? 'tự động — kiểm lại' : undefined });
    } else if (s.decision === 'ambiguous') {
      outParts.push({ q: s.text, generic: false }); // GIỮ NGUYÊN VĂN (review#3)
      disambiguation.push({ text: s.text, options: optionList(s.candidates || [], indexes), reason: s.reason });
    } else {
      // unresolved: bỏ token filler (Việt) + ký tự hư từ Hán; phần "có nghĩa" còn lại →
      // giữ nguyên văn + báo (để LLM D6 / người dùng xử lý).
      const kept = s.text.split(/\s+/)
        .map((t) => (/[㐀-鿿]/.test(t) ? stripHanStop(t) : t))
        .filter((t) => t && !isFiller(t) && !VI_STOP.has(t));
      if (!kept.length) continue;                       // toàn filler → bỏ hẳn khỏi query
      const phrase = kept.join(' ');
      outParts.push({ q: phrase, generic: false });
      unresolved.push(phrase);
    }
  }

  // Cắt cụm generic (treatment/efficacy/…) khi đã có ≥3 khái niệm cụ thể — như legacy.
  const specificCount = outParts.filter((p) => !p.generic).length;
  const finalParts = (specificCount >= 3 ? outParts.filter((p) => !p.generic) : outParts).map((p) => p.q);

  const needs_resolution = mode === 'evidence' && (disambiguation.length > 0 || unresolved.length > 0);
  let warning = null;
  if (disambiguation.length) {
    warning = `Có ${disambiguation.length} cụm chưa rõ nghĩa — cần chọn: ${disambiguation.map((d) => `«${d.text}»`).join(', ')}`;
  } else if (unresolved.length) {
    warning = `Chưa dịch được: ${unresolved.map((u) => `«${u}»`).join(', ')} (giữ nguyên văn trong truy vấn)`;
  }

  return {
    engine_version: ENGINE_VERSION,
    script: norm.script,
    normalized: norm.normalized,
    spans: allSpans.map((s) => ({
      text: s.text, decision: s.decision, stage: s.stage, transform: s.transform,
      conceptId: s.conceptId, en: s.en, confidence: s.confidence, candidates: s.candidates,
    })),
    effective_query: finalParts.join(' ').replace(/\s+/g, ' ').trim(),
    translated,
    disambiguation,
    unresolved,
    needs_resolution,
    warning,
  };
}
