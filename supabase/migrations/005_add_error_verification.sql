-- Add AI analysis and verification columns to error_log
ALTER TABLE error_log ADD COLUMN IF NOT EXISTS ai_analysis jsonb;
ALTER TABLE error_log ADD COLUMN IF NOT EXISTS ai_verification jsonb;
ALTER TABLE error_log ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Update status to support new workflow states
-- Existing: 'new', 'acknowledged', 'resolved', 'ignored'
-- Adding: 'analyzing', 'verified', 'needs_attention'
COMMENT ON COLUMN error_log.status IS 'new | analyzing | acknowledged | resolved | verified | needs_attention | ignored';
