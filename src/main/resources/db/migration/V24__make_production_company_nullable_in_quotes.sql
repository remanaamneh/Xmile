-- V24__make_production_company_nullable_in_quotes.sql
-- Make production_company_id nullable in event_quotes table

ALTER TABLE event_quotes
  MODIFY COLUMN production_company_id BIGINT NULL;

