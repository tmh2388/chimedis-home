// Sổ cái chi phí LLM dùng chung cho MỌI tính năng AI (M0 §16) — ghi lại, KHÔNG chặn.
// Mục đích: sau vài tuần dùng thật (single-user testing), có số liệu thật để tính gói/giá
// (xem [[feedback_chimedis_llm_credit_model]] trong bộ nhớ dự án) thay vì đoán số tuỳ tiện.
// No-op an toàn khi chưa cấu hình MySQL — không bao giờ làm fail tính năng chính.

import { getPool, isDbConfigured } from './db.js';

export async function logAiRun({ userId, projectId, feature, model, tokensIn, tokensOut }) {
  if (!isDbConfigured()) return;
  try {
    await getPool().query(
      `INSERT INTO wb_ai_runs (user_id, project_id, feature, model, tokens_in, tokens_out)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, projectId || null, feature, model, tokensIn || 0, tokensOut || 0]
    );
  } catch (e) {
    console.error('logAiRun:', e.message); // best-effort — không throw, không chặn tính năng chính
  }
}
