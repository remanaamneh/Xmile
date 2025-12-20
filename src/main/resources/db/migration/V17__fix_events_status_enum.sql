-- Fix events.status column to match Java enum

-- Normalize existing values
UPDATE events
SET status = LOWER(status)
WHERE status IS NOT NULL;

-- Fallback for invalid or NULL values
UPDATE events
SET status = 'draft'
WHERE status IS NULL
   OR status NOT IN ('draft','published','completed','cancelled');

-- Convert column type to ENUM
ALTER TABLE events
  MODIFY COLUMN status ENUM(
    'draft',
    'published',
    'completed',
    'cancelled'
  ) NOT NULL DEFAULT 'draft';
