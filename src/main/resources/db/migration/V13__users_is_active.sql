ALTER TABLE users
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

CREATE INDEX idx_users_is_active ON users(is_active);


