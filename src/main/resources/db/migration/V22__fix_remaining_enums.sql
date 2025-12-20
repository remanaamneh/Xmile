-- V22__fix_remaining_enums.sql
-- Fix remaining enum-like columns to match Hibernate expectation (MySQL ENUM + lowercase)

-- =========================
-- participants.status
-- =========================
UPDATE participants
SET status = LOWER(status)
WHERE status IS NOT NULL;

UPDATE participants
SET status = 'registered'
WHERE status IS NULL
   OR status NOT IN ('registered','confirmed','declined','cancelled');

ALTER TABLE participants
  MODIFY COLUMN status ENUM('registered','confirmed','declined','cancelled')
  NOT NULL DEFAULT 'registered';

-- =========================
-- worker_applications.status
-- =========================
UPDATE worker_applications
SET status = LOWER(status)
WHERE status IS NOT NULL;

UPDATE worker_applications
SET status = 'invited'
WHERE status IS NULL
   OR status NOT IN ('invited','applied','accepted','declined','cancelled');

ALTER TABLE worker_applications
  MODIFY COLUMN status ENUM('invited','applied','accepted','declined','cancelled')
  NOT NULL DEFAULT 'invited';

-- =========================
-- registration_form_fields.field_type
-- =========================
UPDATE registration_form_fields
SET field_type = LOWER(field_type)
WHERE field_type IS NOT NULL;

UPDATE registration_form_fields
SET field_type = 'text'
WHERE field_type IS NULL
   OR field_type NOT IN ('text','number','email','phone','select','multi_select','checkbox','date');

ALTER TABLE registration_form_fields
  MODIFY COLUMN field_type ENUM('text','number','email','phone','select','multi_select','checkbox','date')
  NOT NULL;

-- =========================
-- qr_tokens.subject_type + CHECK constraint
-- =========================
ALTER TABLE qr_tokens DROP CHECK chk_qr_tokens_subject;

UPDATE qr_tokens
SET subject_type = LOWER(subject_type)
WHERE subject_type IS NOT NULL;

UPDATE qr_tokens
SET subject_type =
  CASE
    WHEN participant_id IS NOT NULL AND user_id IS NULL THEN 'participant'
    WHEN user_id IS NOT NULL AND participant_id IS NULL THEN 'worker'
    ELSE 'participant'
  END
WHERE subject_type IS NULL
   OR subject_type NOT IN ('participant','worker');

ALTER TABLE qr_tokens
  MODIFY COLUMN subject_type ENUM('participant','worker') NOT NULL;

ALTER TABLE qr_tokens
  ADD CONSTRAINT chk_qr_tokens_subject
  CHECK (
    (subject_type = 'participant' AND participant_id IS NOT NULL AND user_id IS NULL)
    OR
    (subject_type = 'worker' AND user_id IS NOT NULL AND participant_id IS NULL)
  );
