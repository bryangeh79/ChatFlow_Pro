-- Phase: FAQ Translation Workbench
-- Adds translation_status, source_faq_id, reviewed_at to support
-- multi-language FAQ: source (zh master) + per-language published/draft translations

ALTER TABLE tenant_faq_entries
  ADD COLUMN IF NOT EXISTS translation_status TEXT NOT NULL DEFAULT 'source'
    CHECK (translation_status IN ('source', 'draft', 'published'));

ALTER TABLE tenant_faq_entries
  ADD COLUMN IF NOT EXISTS source_faq_id TEXT
    REFERENCES tenant_faq_entries(id) ON DELETE CASCADE;

ALTER TABLE tenant_faq_entries
  ADD COLUMN IF NOT EXISTS reviewed_at TEXT;

-- Backfill: all existing rows are source entries
UPDATE tenant_faq_entries
  SET translation_status = 'source'
  WHERE translation_status IS NULL OR translation_status = '';

-- Index for efficient lookup: find all published translations for a given source
CREATE INDEX IF NOT EXISTS idx_faq_source_translations
  ON tenant_faq_entries (tenant_id, source_faq_id, language, translation_status);
