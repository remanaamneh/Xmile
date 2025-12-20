-- Fix event_quotes.status type to match JPA enum expectation

-- Normalize existing values (safe even if already lowercase)
UPDATE event_quotes
SET status = LOWER(status)
WHERE status IS NOT NULL;

-- Any unexpected/NULL values -> 'submitted'
UPDATE event_quotes
SET status = 'submitted'
WHERE status IS NULL
   OR status NOT IN ('submitted','approved','rejected','cancelled');

-- Convert column type to ENUM
ALTER TABLE event_quotes
  MODIFY COLUMN status ENUM('submitted','approved','rejected','cancelled')
  NOT NULL DEFAULT 'submitted';
