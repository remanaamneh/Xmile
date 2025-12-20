-- Update event_quotes status values to lowercase enum values
-- Convert old uppercase values to new lowercase values

-- Update ESTIMATE -> submitted
UPDATE event_quotes
SET status = 'submitted'
WHERE status = 'ESTIMATE';

-- Update SUBMITTED -> submitted
UPDATE event_quotes
SET status = 'submitted'
WHERE status = 'SUBMITTED';

-- Update APPROVED -> approved
UPDATE event_quotes
SET status = 'approved'
WHERE status = 'APPROVED';

-- Update REJECTED -> rejected
UPDATE event_quotes
SET status = 'rejected'
WHERE status = 'REJECTED';

-- Update CANCELLED -> cancelled
UPDATE event_quotes
SET status = 'cancelled'
WHERE status = 'CANCELLED';

-- Update any other unexpected values to 'submitted'
UPDATE event_quotes
SET status = 'submitted'
WHERE status NOT IN ('submitted', 'approved', 'rejected', 'cancelled');

-- Update default value in table definition
ALTER TABLE event_quotes
  MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'submitted';

