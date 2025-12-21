-- Migration V33: Fix event_quotes.status ENUM to include all Java enum values
-- MySQL is case-insensitive for ENUM, so we use only uppercase values
-- Java enum values will be mapped: submitted->SUBMITTED, approved->APPROVED, etc.

-- Step 1: Convert ENUM to VARCHAR temporarily
ALTER TABLE event_quotes
  MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED';

-- Step 2: Map existing values to uppercase format
UPDATE event_quotes
SET status = CASE
    WHEN UPPER(status) = 'PENDING_ADMIN_APPROVAL' THEN 'MANAGER_REVIEW'
    WHEN UPPER(status) = 'APPROVED' THEN 'APPROVED'
    WHEN UPPER(status) = 'REJECTED' THEN 'REJECTED'
    WHEN UPPER(status) = 'NEEDS_CHANGES' THEN 'REJECTED'
    WHEN UPPER(status) = 'SUBMITTED' OR status = 'submitted' THEN 'SUBMITTED'
    WHEN UPPER(status) = 'CANCELLED' OR status = 'cancelled' THEN 'CLOSED'
    ELSE 'SUBMITTED'
END;

-- Step 3: Convert back to ENUM with uppercase values only
-- Note: MySQL is case-insensitive, so 'submitted' in Java will map to 'SUBMITTED' here
ALTER TABLE event_quotes
  MODIFY COLUMN status ENUM(
    'SUBMITTED',        -- Maps to Java: submitted
    'APPROVED',         -- Maps to Java: approved or APPROVED
    'REJECTED',         -- Maps to Java: rejected or REJECTED
    'CANCELLED',        -- Maps to Java: cancelled
    'DRAFT',            -- Maps to Java: DRAFT
    'SENT_TO_MANAGER',  -- Maps to Java: SENT_TO_MANAGER
    'MANAGER_REVIEW',   -- Maps to Java: MANAGER_REVIEW
    'CLOSED'            -- Maps to Java: CLOSED
  ) NOT NULL DEFAULT 'SUBMITTED';

