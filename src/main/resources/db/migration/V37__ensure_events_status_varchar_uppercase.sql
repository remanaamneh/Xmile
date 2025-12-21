-- Migration V37: Ensure events.status is VARCHAR(30) and normalize to UPPERCASE
-- This fixes potential "Data truncated for column 'status'" errors
-- The Java Event entity uses @Enumerated(EnumType.STRING) which requires VARCHAR, not ENUM

-- Step 1: Convert status column to VARCHAR(30) if it's ENUM
-- This handles both ENUM and VARCHAR cases
ALTER TABLE events
  MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'DRAFT';

-- Step 2: Normalize all existing status values to UPPERCASE
-- This ensures consistency with Java EventStatus enum (all uppercase)
UPDATE events
SET status = UPPER(status)
WHERE status IS NOT NULL AND status != UPPER(status);

-- Step 3: Map any legacy lowercase values to their uppercase equivalents
UPDATE events
SET status = 'DRAFT'
WHERE LOWER(status) = 'draft' AND status != 'DRAFT';

UPDATE events
SET status = 'PUBLISHED'
WHERE LOWER(status) = 'published' AND status != 'PUBLISHED';

UPDATE events
SET status = 'PENDING_APPROVAL'
WHERE LOWER(status) = 'pending_approval' AND status != 'PENDING_APPROVAL';

UPDATE events
SET status = 'APPROVED'
WHERE LOWER(status) = 'approved' AND status != 'APPROVED';

UPDATE events
SET status = 'CONFIRMED'
WHERE LOWER(status) = 'confirmed' AND status != 'CONFIRMED';

UPDATE events
SET status = 'QUOTE_PENDING'
WHERE LOWER(status) = 'quote_pending' AND status != 'QUOTE_PENDING';

UPDATE events
SET status = 'COMPLETED'
WHERE LOWER(status) = 'completed' AND status != 'COMPLETED';

UPDATE events
SET status = 'CANCELLED'
WHERE LOWER(status) IN ('cancelled', 'canceled') AND status != 'CANCELLED';

-- Step 4: Set default for any NULL or empty values (safety check)
UPDATE events
SET status = 'DRAFT'
WHERE status IS NULL OR status = '';

-- Step 5: Ensure the column constraint is correct
ALTER TABLE events
  MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'DRAFT';

