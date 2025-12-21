-- Fix events.status column to match Java EventStatus enum (uppercase)
-- The Java enum has: DRAFT, PUBLISHED, PENDING_APPROVAL, APPROVED, CONFIRMED, QUOTE_PENDING, COMPLETED, CANCELLED

-- First, convert existing lowercase values to uppercase
UPDATE events
SET status = UPPER(status)
WHERE status IS NOT NULL;

-- Map old values to new enum values
UPDATE events
SET status = 'DRAFT'
WHERE status IN ('DRAFT', 'draft');

UPDATE events
SET status = 'PUBLISHED'
WHERE status IN ('PUBLISHED', 'published');

UPDATE events
SET status = 'PENDING_APPROVAL'
WHERE status IN ('PENDING_APPROVAL', 'pending_approval', 'PENDING', 'pending');

UPDATE events
SET status = 'APPROVED'
WHERE status IN ('APPROVED', 'approved');

UPDATE events
SET status = 'CONFIRMED'
WHERE status IN ('CONFIRMED', 'confirmed');

UPDATE events
SET status = 'QUOTE_PENDING'
WHERE status IN ('QUOTE_PENDING', 'quote_pending', 'QUOTE', 'quote');

UPDATE events
SET status = 'COMPLETED'
WHERE status IN ('COMPLETED', 'completed');

UPDATE events
SET status = 'CANCELLED'
WHERE status IN ('CANCELLED', 'cancelled', 'CANCELED', 'canceled');

-- Fallback for any invalid or NULL values
UPDATE events
SET status = 'DRAFT'
WHERE status IS NULL
   OR status NOT IN ('DRAFT', 'PUBLISHED', 'PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'QUOTE_PENDING', 'COMPLETED', 'CANCELLED');

-- Convert column type to ENUM with uppercase values
ALTER TABLE events
  MODIFY COLUMN status ENUM(
    'DRAFT',
    'PUBLISHED',
    'PENDING_APPROVAL',
    'APPROVED',
    'CONFIRMED',
    'QUOTE_PENDING',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'DRAFT';

