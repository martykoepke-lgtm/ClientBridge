-- Prevent projects from having vercel_url set to the ClientBridge domain itself.
-- This caused a circular fetch loop where the proxy would fetch itself infinitely.

-- Fix any existing bad data first
UPDATE projects
SET vercel_url = NULL, review_link_active = false
WHERE vercel_url ILIKE '%clientbridge.dev%'
   OR vercel_url ILIKE '%clientbridge.vercel.app%';

-- Add a check constraint to prevent this in the future
ALTER TABLE projects
ADD CONSTRAINT chk_vercel_url_not_self_referencing
CHECK (
  vercel_url IS NULL
  OR (
    vercel_url NOT ILIKE '%clientbridge.dev%'
    AND vercel_url NOT ILIKE '%clientbridge.vercel.app%'
  )
);
