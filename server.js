import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import documentRoutes, { adminRouter as adminDocumentRoutes } from './routes/documents.js';
import userRoutes from './routes/users.js';
import orcidRoutes from './routes/orcid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===== API (dùng chung cho cả 2 domain) =====
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin/documents', adminDocumentRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/orcid', orcidRoutes);

// ===== Định tuyến theo domain =====
// Hostinger trỏ CẢ HAI domain `chimedis.vn` và `admin.chimedis.vn` vào CÙNG 1 app Node
// này (2 domain alias trên cùng 1 Website app hPanel) — phân biệt bằng hostname, không
// phải 2 lần deploy riêng. `/admin` path cũng luôn phục vụ được (kể cả trên domain chính,
// và khi test local qua localhost) để tiện xem trước không cần đổi DNS/hosts file.
const ADMIN_HOST = 'admin.chimedis.vn';
const adminPublicDir = path.join(__dirname, 'admin-public');
const publicDir = path.join(__dirname, 'public');

app.use('/admin', express.static(adminPublicDir));
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(adminPublicDir, 'index.html'));
});

app.use((req, res, next) => {
  if (req.hostname === ADMIN_HOST) {
    return express.static(adminPublicDir)(req, res, next);
  }
  express.static(publicDir)(req, res, next);
});

app.get('*', (req, res) => {
  if (req.hostname === ADMIN_HOST) {
    return res.sendFile(path.join(adminPublicDir, 'index.html'));
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Chimedis portal listening on port ${PORT}`);
});
