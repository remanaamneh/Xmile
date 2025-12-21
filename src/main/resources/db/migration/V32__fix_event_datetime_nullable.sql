-- Migration V32: Fix event_datetime to allow NULL for new records
-- The @PrePersist method will calculate it from eventDate and startTime

-- Make event_datetime nullable to allow inserts
ALTER TABLE events 
  MODIFY COLUMN event_datetime DATETIME NULL;

-- Update any existing NULL values from event_date and start_time
UPDATE events
SET event_datetime = CONCAT(event_date, ' ', start_time)
WHERE event_datetime IS NULL 
  AND event_date IS NOT NULL 
  AND start_time IS NOT NULL;

