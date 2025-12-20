-- Fix event_quotes.status type back to ENUM (V25 changed it to VARCHAR incorrectly)
-- This migration fixes the column type to match the JPA enum expectation

-- First, ensure all values are valid enum values
UPDATE event_quotes
SET status = 'submitted'
WHERE status NOT IN ('submitted','approved','rejected','cancelled');

-- Convert column type back to ENUM
ALTER TABLE event_quotes
  MODIFY COLUMN status ENUM('submitted','approved','rejected','cancelled')
  NOT NULL DEFAULT 'submitted';

