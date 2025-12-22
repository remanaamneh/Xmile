-- Migration V38: Add rejected_at column to event_quotes
-- This allows tracking when a quote was rejected

ALTER TABLE event_quotes
  ADD COLUMN rejected_at DATETIME NULL AFTER approved_at;

-- Set rejected_at for existing rejected quotes based on updated_at
-- This is a best-effort migration for historical data
UPDATE event_quotes
SET rejected_at = updated_at
WHERE status = 'REJECTED' 
  AND rejected_at IS NULL;

