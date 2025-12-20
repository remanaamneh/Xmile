-- Fix status column type in event_worker_requests to match Java enum

ALTER TABLE event_worker_requests
  MODIFY COLUMN status ENUM('open','closed','cancelled') NOT NULL;
