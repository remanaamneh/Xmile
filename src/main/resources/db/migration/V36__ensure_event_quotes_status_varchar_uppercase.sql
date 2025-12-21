-- Migration V36: Ensure event_quotes.status is VARCHAR(32) and normalize to UPPERCASE
-- This fixes "Data truncated for column 'status'" errors when storing enum values

-- Step 1: Convert status column to VARCHAR(32) if it's not already
-- This handles both ENUM and VARCHAR cases
ALTER TABLE event_quotes
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED';

-- Step 2: Normalize all existing status values to UPPERCASE
-- This ensures consistency with Java EventQuoteStatus enum (all uppercase)
UPDATE event_quotes
SET status = UPPER(status)
WHERE status IS NOT NULL AND status != UPPER(status);

-- Step 3: Map any legacy lowercase values to their uppercase equivalents
UPDATE event_quotes
SET status = 'SUBMITTED'
WHERE LOWER(status) = 'submitted' AND status != 'SUBMITTED';

UPDATE event_quotes
SET status = 'APPROVED'
WHERE LOWER(status) = 'approved' AND status != 'APPROVED';

UPDATE event_quotes
SET status = 'REJECTED'
WHERE LOWER(status) = 'rejected' AND status != 'REJECTED';

UPDATE event_quotes
SET status = 'CANCELLED'
WHERE LOWER(status) = 'cancelled' AND status != 'CANCELLED';

UPDATE event_quotes
SET status = 'DRAFT'
WHERE LOWER(status) = 'draft' AND status != 'DRAFT';

UPDATE event_quotes
SET status = 'SENT_TO_MANAGER'
WHERE LOWER(status) = 'sent_to_manager' AND status != 'SENT_TO_MANAGER';

UPDATE event_quotes
SET status = 'MANAGER_REVIEW'
WHERE LOWER(status) = 'manager_review' AND status != 'MANAGER_REVIEW';

UPDATE event_quotes
SET status = 'CLOSED'
WHERE LOWER(status) = 'closed' AND status != 'CLOSED';

-- Step 4: Set default for any NULL or empty values (safety check)
UPDATE event_quotes
SET status = 'SUBMITTED'
WHERE status IS NULL OR status = '';

-- Step 5: Ensure the column constraint is correct
ALTER TABLE event_quotes
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED';

-- Step 6: Add a check constraint to ensure only valid enum values (optional, but helpful)
-- Note: MySQL doesn't support CHECK constraints in older versions, so we'll skip this
-- The application layer (Java enum) will enforce valid values

