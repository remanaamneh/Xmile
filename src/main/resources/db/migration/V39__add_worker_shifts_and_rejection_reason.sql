-- Migration V39: Add worker_shifts table and rejection_reason to worker_applications

-- Add rejection_reason to worker_applications
ALTER TABLE worker_applications
  ADD COLUMN rejection_reason TEXT NULL AFTER status;

-- Add location_text and availability to worker_profiles if missing
SET @col_exists_location_text = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'worker_profiles'
    AND COLUMN_NAME = 'location_text'
);

SET @sql_location_text = IF(@col_exists_location_text = 0,
    'ALTER TABLE worker_profiles ADD COLUMN location_text VARCHAR(255) NULL AFTER city',
    'SELECT "Column location_text already exists" AS message'
);

PREPARE stmt_location_text FROM @sql_location_text;
EXECUTE stmt_location_text;
DEALLOCATE PREPARE stmt_location_text;

SET @col_exists_availability = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'worker_profiles'
    AND COLUMN_NAME = 'availability'
);

SET @sql_availability = IF(@col_exists_availability = 0,
    'ALTER TABLE worker_profiles ADD COLUMN availability VARCHAR(100) NULL AFTER location_text',
    'SELECT "Column availability already exists" AS message'
);

PREPARE stmt_availability FROM @sql_availability;
EXECUTE stmt_availability;
DEALLOCATE PREPARE stmt_availability;

-- Create worker_shifts table for tracking worker work hours
CREATE TABLE worker_shifts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    worker_user_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_worker_shifts_user
        FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_shifts_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_worker_shifts_user_id ON worker_shifts(worker_user_id);
CREATE INDEX idx_worker_shifts_event_id ON worker_shifts(event_id);
CREATE INDEX idx_worker_shifts_work_date ON worker_shifts(work_date);
CREATE INDEX idx_worker_shifts_user_date ON worker_shifts(worker_user_id, work_date);

