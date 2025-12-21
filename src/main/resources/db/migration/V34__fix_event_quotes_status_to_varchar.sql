-- Migration V34: Change event_quotes.status from ENUM to VARCHAR
-- This avoids ENUM value mismatches and allows flexible status values
-- Recommended approach: VARCHAR is more flexible and avoids truncation errors

-- Step 1: Convert ENUM to VARCHAR
ALTER TABLE event_quotes
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED';

-- Step 2: Normalize existing values to uppercase (consistent with Java enum)
UPDATE event_quotes
SET status = UPPER(status)
WHERE status IS NOT NULL;

-- Step 3: Set default for any NULL values (shouldn't happen, but safety check)
UPDATE event_quotes
SET status = 'SUBMITTED'
WHERE status IS NULL OR status = '';

-- Step 4: Ensure default constraint
ALTER TABLE event_quotes
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED';

