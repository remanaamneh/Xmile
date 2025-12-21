-- Migration V35: Add admin_rejection_reason column to event_quotes
-- This allows storing rejection reasons separately from general notes

ALTER TABLE event_quotes
  ADD COLUMN admin_rejection_reason TEXT NULL AFTER notes;

-- Update existing rejection reasons from notes field if they exist
-- This is a one-time migration to extract existing rejection reasons
UPDATE event_quotes
SET admin_rejection_reason = SUBSTRING_INDEX(SUBSTRING_INDEX(notes, 'סיבת דחייה:', -1), '\n', 1)
WHERE status = 'REJECTED' 
  AND notes LIKE '%סיבת דחייה:%'
  AND admin_rejection_reason IS NULL;

