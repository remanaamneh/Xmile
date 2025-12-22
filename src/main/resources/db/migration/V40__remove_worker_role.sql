-- Migration to remove WORKER role from the system
-- Update all existing WORKER users to CLIENT role

-- Update users table: change all WORKER roles to CLIENT
UPDATE users 
SET role = 'CLIENT' 
WHERE role = 'WORKER';

-- Note: Worker-related tables (worker_profiles, worker_applications, worker_offers, etc.)
-- are kept for data integrity but will not be used going forward.
-- The WORKER role is removed from the Role enum in the application code.

