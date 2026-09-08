import admin from 'firebase-admin';

// Cùng project Firebase "chimedis" đã dùng cho dict.chimedis.vn (đăng nhập Google/Email/
// Facebook) — dùng chung 1 danh tính người dùng cho toàn bộ hệ sinh thái Chimedis.
// Optional pattern: nếu chưa cấu hình FIREBASE_ADMIN_CREDENTIALS_JSON_B64, app vẫn chạy,
// chỉ các route cần đăng nhập trả 503.
let firebaseApp = null;
if (process.env.FIREBASE_ADMIN_CREDENTIALS_JSON_B64) {
  try {
    const json = Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS_JSON_B64, 'base64').toString('utf8');
    const credentials = JSON.parse(json);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
  } catch (err) {
    console.error('⚠️  Không khởi tạo được Firebase Admin (kiểm tra FIREBASE_ADMIN_CREDENTIALS_JSON_B64):', err.message);
  }
}

export function isFirebaseConfigured() {
  return !!firebaseApp;
}

/** Trả về admin.auth() nếu Firebase Admin đã cấu hình, ngược lại null — dùng để tạo/xoá user trực tiếp. */
export function getFirebaseAuth() {
  return firebaseApp ? admin.auth() : null;
}

/**
 * Middleware: xác thực Firebase ID token trong header `Authorization: Bearer <token>`.
 * Thành công -> req.firebaseUser = { uid, email, name, picture }.
 */
export async function verifyFirebaseToken(req, res, next) {
  if (!firebaseApp) {
    return res.status(503).json({ success: false, error: 'Đăng nhập chưa được cấu hình trên server' });
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Thiếu token đăng nhập' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // provider đăng nhập của phiên hiện tại + subject bền vững của provider (KHÔNG phải email).
    const provider = decoded.firebase?.sign_in_provider || 'unknown';
    const identities = decoded.firebase?.identities || {};
    let providerSubject = decoded.uid;
    if (provider === 'google.com' && identities['google.com']?.[0]) providerSubject = identities['google.com'][0];
    else if (provider === 'apple.com' && identities['apple.com']?.[0]) providerSubject = identities['apple.com'][0];
    else if (provider === 'password') providerSubject = decoded.email || decoded.uid;
    req.firebaseUser = {
      uid: decoded.uid,
      email: decoded.email || null,
      email_verified: decoded.email_verified === true,
      name: decoded.name || null,
      picture: decoded.picture || null,
      provider,               // 'password' | 'google.com' | 'apple.com' | 'oidc.orcid' | ...
      provider_subject: String(providerSubject),
    };
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}
