ALTER TABLE event_worker_requests
ADD COLUMN requested_workers INT NOT NULL DEFAULT 0;
