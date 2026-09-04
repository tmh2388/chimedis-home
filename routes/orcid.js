import { Router } from 'express';
import crypto from 'crypto';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser } from '../lib/auth.js';

// Liên kết hồ sơ ORCID vào tài khoản đã đăng nhập (Firebase) — KHÔNG dùng ORCID để đăng
// nhập chính (Google/Email/Facebook qua Firebase vẫn là cách đăng nhập chính, giữ nhất
// quán với dict.chimedis.vn). ORCID chỉ xác thực + hiển thị mã ORCID thật trên hồ sơ tác giả.
//
// Cần đăng ký ứng dụng Public API tại https://orcid.org/developer-tools (miễn phí, cần tài
// khoản ORCID đã xác thực email) để lấy ORCID_CLIENT_ID + ORCID_CLIENT_SECRET, và khai báo
// đúng Redirect URI (vd https://admin.chimedis.vn/api/orcid/callback) trong ORCID console.
// Dùng ORCID_ENV=sandbox để test trước với sandbox.orcid.org (tài khoản test riêng, không
// tính vào ORCID thật) trước khi chuyển ORCID_ENV=production.
const ORCID_BASE = process.env.ORCID_ENV === 'sandbox' ? 'https://sandbox.orcid.org' : 'https://orcid.org';
const ORCID_API_BASE = process.env.ORCID_ENV === 'sandbox' ? 'https://api.sandbox.orcid.org' : 'https://pub.orcid.org';

function isOrcidConfigured() {
  return !!(process.env.ORCID_CLIENT_ID && process.env.ORCID_CLIENT_SECRET && process.env.ORCID_REDIRECT_URI && process.env.ORCID_STATE_SECRET);
}

function signState(uid) {
  const payload = Buffer.from(JSON.stringify({ uid, ts: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.ORCID_STATE_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verifyState(state) {
  const [payload, sig] = String(state || '').split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', process.env.ORCID_STATE_SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const { uid, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (Date.now() - ts > 10 * 60 * 1000) return null; // hết hạn sau 10 phút
  return uid;
}

const router = Router();

// GET /api/orcid/start — yêu cầu đã đăng nhập (Bearer token, KHÔNG phải cookie session nên
// không dùng res.redirect trực tiếp — trả về `url` để frontend tự window.location.href sang đó).
router.get('/start', requireUser, (req, res) => {
  if (!isOrcidConfigured()) {
    return res.status(503).json({ success: false, error: 'Liên kết ORCID chưa được cấu hình trên server' });
  }
  const state = signState(req.firebaseUser.uid);
  const url = new URL(`${ORCID_BASE}/oauth/authorize`);
  url.searchParams.set('client_id', process.env.ORCID_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', '/authenticate');
  url.searchParams.set('redirect_uri', process.env.ORCID_REDIRECT_URI);
  url.searchParams.set('state', state);
  res.json({ success: true, url: url.toString() });
});

// GET /api/orcid/callback — ORCID redirect về đây kèm ?code=&state=.
router.get('/callback', async (req, res) => {
  if (!isOrcidConfigured()) {
    return res.status(503).send('Liên kết ORCID chưa được cấu hình trên server');
  }
  if (!isDbConfigured()) {
    return res.status(503).send('Database chưa được cấu hình trên server');
  }
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(`ORCID từ chối cấp quyền: ${error}`);
  const uid = verifyState(state);
  if (!uid) return res.status(400).send('Phiên liên kết ORCID không hợp lệ hoặc đã hết hạn — thử lại.');
  try {
    const tokenRes = await fetch(`${ORCID_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: process.env.ORCID_CLIENT_ID,
        client_secret: process.env.ORCID_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.ORCID_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.orcid) {
      console.error('ORCID token exchange failed:', tokenData);
      return res.status(502).send('Không lấy được mã ORCID — thử lại sau.');
    }
    await getPool().query(
      'UPDATE users SET orcid_id = ?, orcid_verified = 1 WHERE firebase_uid = ?',
      [tokenData.orcid, uid]
    );
    res.redirect('/?orcid=linked');
  } catch (err) {
    console.error('ORCID callback error:', err.message);
    res.status(500).send('Lỗi liên kết ORCID');
  }
});

// DELETE /api/orcid — bỏ liên kết ORCID khỏi tài khoản.
router.delete('/', requireUser, async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ success: false, error: 'Database chưa được cấu hình' });
  try {
    await getPool().query('UPDATE users SET orcid_id = NULL, orcid_verified = 0 WHERE firebase_uid = ?', [req.firebaseUser.uid]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/orcid error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi bỏ liên kết ORCID' });
  }
});

export default router;
export { isOrcidConfigured };
