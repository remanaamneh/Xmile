-- Fix status column type for notification_recipients

-- Normalize existing data
UPDATE notification_recipients
SET status = 'pending'
WHERE status IS NULL
   OR status NOT IN ('pending','sent','failed','skipped');

-- Change column to ENUM
ALTER TABLE notification_recipients
MODIFY COLUMN status
ENUM('pending','sent','failed','skipped')
NOT NULL
DEFAULT 'pending';
