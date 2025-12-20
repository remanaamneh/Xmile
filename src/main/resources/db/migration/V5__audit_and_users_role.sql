-- Ensure consistent engine/charset for core tables and fix users.role enum to match Java Role names

-- users: engine + charset/collation
ALTER TABLE users ENGINE=InnoDB;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- users.role: normalize existing data to uppercase, then enforce uppercase enum only
UPDATE users
SET role = UPPER(role);

ALTER TABLE users
  MODIFY COLUMN role ENUM('ADMIN','CLIENT','PARTICIPANT','WORKER') NOT NULL;

-- users audit columns
ALTER TABLE users
  MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- production_companies audit/charset
ALTER TABLE production_companies ENGINE=InnoDB;
ALTER TABLE production_companies CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE production_companies
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- companies audit/charset (V4 created it as utf8mb4 without explicit collation)
ALTER TABLE companies ENGINE=InnoDB;
ALTER TABLE companies CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- keep type consistent with others (TIMESTAMP) and add updated_at
ALTER TABLE companies
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
