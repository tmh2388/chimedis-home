// Milestone H1a — giới hạn tần suất trong bộ nhớ (spec §9.4). Đủ cho 1 tiến trình web
// Hostinger; không cần Redis. Khoá theo IP (route công khai) hoặc user id (route đăng nhập).

const buckets = new Map(); // key -> [timestamps]

/**
 * @param {{ windowMs?:number, max?:number, keyFn?:(req)=>string }} opts
 */
export function rateLimit({ windowMs = 60_000, max = 30, keyFn } = {}) {
  return (req, res, next) => {
    const key = (keyFn ? keyFn(req) : ipOf(req)) + '|' + (req.baseUrl || '') + (req.route?.path || req.path || '');
    const now = Date.now();
    const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      const retry = Math.ceil((windowMs - (now - arr[0])) / 1000);
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({ success: false, error: `Quá nhiều yêu cầu — thử lại sau ${retry}s.` });
    }
    arr.push(now);
    buckets.set(key, arr);
    if (buckets.size > 5000) { // dọn rác thô
      for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
    }
    next();
  };
}

function ipOf(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.socket?.remoteAddress || 'unknown';
}
