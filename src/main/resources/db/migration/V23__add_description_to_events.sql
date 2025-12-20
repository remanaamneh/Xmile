-- V23__add_description_to_events.sql
-- Add description column to events table

ALTER TABLE events
  ADD COLUMN description TEXT NULL
  AFTER name;

