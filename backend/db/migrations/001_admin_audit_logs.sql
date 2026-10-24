-- =============================================================================
-- Migration 001: Admin Audit Logs & Time-Series Indexes
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id             BIGSERIAL PRIMARY KEY,
    admin_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_username VARCHAR(100) NOT NULL,
    action         VARCHAR(50)  NOT NULL,
    entity_type    VARCHAR(30)  NOT NULL,
    entity_id      VARCHAR(64),
    summary        VARCHAR(500) NOT NULL,
    details        JSONB,
    ip_address     VARCHAR(45),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON admin_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin   ON admin_audit_logs (admin_id);

-- Indexes phục vụ Dashboard Trend Charts (Phase 3)
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON search_queries (created_at);
CREATE INDEX IF NOT EXISTS idx_llm_logs_created       ON llm_request_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_created        ON reviews (created_at);
