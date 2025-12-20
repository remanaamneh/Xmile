ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','client','participant','worker') NOT NULL;
