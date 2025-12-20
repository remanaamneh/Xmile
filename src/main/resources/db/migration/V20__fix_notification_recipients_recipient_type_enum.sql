-- Fix recipient_type column type to match Hibernate validation.
-- Expected by the app: ENUM('user','participant')

-- 1) Drop the old CHECK constraint (it was created with 'USER'/'PARTICIPANT')
ALTER TABLE notification_recipients
  DROP CHECK chk_notification_recipients_subject;

-- 2) Normalize existing values (if any) before converting the column type
UPDATE notification_recipients
SET recipient_type = LOWER(recipient_type)
WHERE recipient_type IN ('USER', 'PARTICIPANT');

-- 3) Convert the column to MySQL ENUM
ALTER TABLE notification_recipients
  MODIFY COLUMN recipient_type ENUM('user','participant') NOT NULL;

-- 4) Re-create the CHECK constraint with lowercase values
ALTER TABLE notification_recipients
  ADD CONSTRAINT chk_notification_recipients_subject
  CHECK (
    (recipient_type = 'user' AND user_id IS NOT NULL AND participant_id IS NULL)
    OR
    (recipient_type = 'participant' AND participant_id IS NOT NULL AND user_id IS NULL)
  );
