-- Fix notifications + notification_recipients enum columns to match Hibernate enum mapping
-- Hibernate with MySQL often validates @Enumerated(EnumType.STRING) columns as MySQL ENUM types.

-- =============================
-- notifications.channel
-- =============================

-- 1) Normalize existing values to lowercase
UPDATE notifications
SET channel = LOWER(channel)
WHERE channel IS NOT NULL;

-- 2) Force into allowed set
UPDATE notifications
SET channel = 'email'
WHERE channel IS NULL OR channel NOT IN ('email','sms','whatsapp');

-- 3) Convert column to ENUM
ALTER TABLE notifications
  MODIFY COLUMN channel ENUM('email','sms','whatsapp') NOT NULL;

-- =============================
-- notifications.status
-- =============================

UPDATE notifications
SET status = LOWER(status)
WHERE status IS NOT NULL;

UPDATE notifications
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending','scheduled','sent','failed','cancelled');

ALTER TABLE notifications
  MODIFY COLUMN status ENUM('pending','scheduled','sent','failed','cancelled') NOT NULL DEFAULT 'pending';

-- =============================
-- notification_recipients.status
-- =============================

UPDATE notification_recipients
SET status = LOWER(status)
WHERE status IS NOT NULL;

UPDATE notification_recipients
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending','sent','failed','skipped');

ALTER TABLE notification_recipients
  MODIFY COLUMN status ENUM('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending';
