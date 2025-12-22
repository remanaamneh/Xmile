-- Migration to remove PARTICIPANT role from the system
-- Update all existing PARTICIPANT users to CLIENT role

-- Update users table: change all PARTICIPANT roles to CLIENT
UPDATE users 
SET role = 'CLIENT' 
WHERE role = 'PARTICIPANT';

-- Modify users table role column to only allow ADMIN and CLIENT
ALTER TABLE users 
MODIFY COLUMN role ENUM('ADMIN','CLIENT') NOT NULL;

