-- Add billing and complexity fields to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'hourly';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS quoted_amount numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_hours numeric;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS complexity_profile jsonb DEFAULT '{}';

-- complexity_profile structure:
-- {
--   "app_type": "web_app",           -- marketing_site | web_app | dashboard | api_backend | mobile_app | chrome_extension
--   "audience": "b2b",               -- b2b | b2c | internal
--   "access": "public",              -- public | org_whitelisted | invite_only | personal
--   "multi_tenant": false,
--   "auth_level": "oauth",           -- none | basic | oauth | sso
--   "database_complexity": "simple", -- none | simple | complex
--   "deployment": "simple",          -- simple | complex
--   "integrations": ["stripe", "email", "ai", "google", "slack", "analytics", "cms", "maps", "sms", "webhooks"],
--   "features": ["rbac", "file_uploads", "realtime", "notifications", "search", "reporting", "pdf", "scheduling", "i18n", "import_export"]
-- }

-- Add constraint for billing_type
ALTER TABLE public.projects ADD CONSTRAINT projects_billing_type_check
  CHECK (billing_type IN ('hourly', 'flat_rate', 'retainer'));
