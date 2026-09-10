-- P0 rollout — persistent sink cho shadow validation (thay hPanel Runtime logs vốn không giữ lâu).
-- MỘT bảng duy nhất. Ghi best-effort/async từ lib/translate/shadow-log.js; lỗi ghi KHÔNG làm fail search.
-- Organic traffic: CHỈ metrics + hash (không raw query, không user identity).
-- Synthetic workload có test_tag rõ ràng: mới lưu full legacy/v2 outcome.
-- Retention 14 ngày (prune cơ hội trong sink module).

CREATE TABLE IF NOT EXISTS translate_shadow_log (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  engine_version    VARCHAR(24)  NULL,
  mode              ENUM('discovery','evidence') NOT NULL DEFAULT 'discovery',
  agree             TINYINT(1)   NOT NULL,

  -- metrics có cấu trúc (không PII)
  legacy_len        SMALLINT UNSIGNED NULL,
  v2_len            SMALLINT UNSIGNED NULL,
  conf_high         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  conf_medium       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  conf_low          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ambiguous_count   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  unresolved_count  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  needs_resolution  TINYINT(1)   NOT NULL DEFAULT 0,

  -- hash để đối chiếu mà không lưu văn bản (sha256 prefix 16 hex)
  legacy_hash       CHAR(16) NULL,
  v2_hash           CHAR(16) NULL,

  -- tag test synthetic — CHỈ khi set mới ghi full outcome
  test_tag          VARCHAR(48) NULL,
  legacy_outcome    TEXT NULL,
  v2_outcome        TEXT NULL,

  search_run_id     BIGINT NULL,

  INDEX idx_created     (created_at),
  INDEX idx_mode_agree  (mode, agree, created_at),
  INDEX idx_test_tag    (test_tag, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
