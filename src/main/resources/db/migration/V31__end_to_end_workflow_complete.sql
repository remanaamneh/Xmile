-- Migration V31: Complete End-to-End Workflow Support
-- This replaces the failed V30 and adds all necessary changes

-- Step 1: Safely update event_quotes.status ENUM
-- Strategy: MySQL is case-insensitive for ENUM, so we can't have both 'approved' and 'APPROVED'
-- We'll convert to VARCHAR temporarily, update data, then convert back to ENUM

-- Step 1a: Convert ENUM to VARCHAR temporarily
ALTER TABLE event_quotes
  MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'submitted';

-- Step 1b: Update data to new format
UPDATE event_quotes
SET status = CASE
    WHEN status = 'submitted' THEN 'PENDING_ADMIN_APPROVAL'
    WHEN status = 'approved' THEN 'APPROVED'
    WHEN status = 'rejected' THEN 'REJECTED'
    WHEN status = 'cancelled' THEN 'REJECTED'
    ELSE 'PENDING_ADMIN_APPROVAL'
END;

-- Step 1c: Convert back to ENUM with new values
ALTER TABLE event_quotes
  MODIFY COLUMN status ENUM(
    'PENDING_ADMIN_APPROVAL',
    'APPROVED',
    'REJECTED',
    'NEEDS_CHANGES'
  ) NOT NULL DEFAULT 'PENDING_ADMIN_APPROVAL';

-- Step 2: Add missing columns to event_quotes if they don't exist
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'event_quotes'
    AND COLUMN_NAME = 'system_suggested_price'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE event_quotes ADD COLUMN system_suggested_price DECIMAL(10,2) NULL AFTER quote_amount',
    'SELECT "Column system_suggested_price already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists2 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'event_quotes'
    AND COLUMN_NAME = 'final_price'
);

SET @sql2 = IF(@col_exists2 = 0,
    'ALTER TABLE event_quotes ADD COLUMN final_price DECIMAL(10,2) NULL AFTER system_suggested_price',
    'SELECT "Column final_price already exists" AS message'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SET @col_exists3 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'event_quotes'
    AND COLUMN_NAME = 'admin_notes'
);

SET @sql3 = IF(@col_exists3 = 0,
    'ALTER TABLE event_quotes ADD COLUMN admin_notes TEXT NULL AFTER notes',
    'SELECT "Column admin_notes already exists" AS message'
);

PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Step 3: Update events table - add event_datetime and location_text if missing
SET @col_exists4 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'events'
    AND COLUMN_NAME = 'event_datetime'
);

SET @sql4 = IF(@col_exists4 = 0,
    'ALTER TABLE events ADD COLUMN event_datetime DATETIME NULL AFTER start_time',
    'SELECT "Column event_datetime already exists" AS message'
);

PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- Populate event_datetime from existing event_date and start_time
UPDATE events
SET event_datetime = CONCAT(event_date, ' ', start_time)
WHERE event_datetime IS NULL AND event_date IS NOT NULL AND start_time IS NOT NULL;

-- Make event_datetime NOT NULL if we have data, but allow NULL for new records
-- We'll use a trigger or application logic to populate it
-- For now, keep it nullable to allow inserts, then update to NOT NULL only if we have data
SET @has_data = (SELECT COUNT(*) FROM events WHERE event_datetime IS NOT NULL);
SET @sql4b = IF(@has_data > 0,
    'ALTER TABLE events MODIFY COLUMN event_datetime DATETIME NULL',
    'SELECT "Keeping event_datetime nullable for new records" AS message'
);

PREPARE stmt4b FROM @sql4b;
EXECUTE stmt4b;
DEALLOCATE PREPARE stmt4b;

SET @col_exists5 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'events'
    AND COLUMN_NAME = 'location_text'
);

SET @sql5 = IF(@col_exists5 = 0,
    'ALTER TABLE events ADD COLUMN location_text VARCHAR(255) NULL AFTER location',
    'SELECT "Column location_text already exists" AS message'
);

PREPARE stmt5 FROM @sql5;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

-- Populate location_text from location
UPDATE events
SET location_text = location
WHERE location_text IS NULL AND location IS NOT NULL;

-- Step 4: Update events.status ENUM to new workflow values
-- Strategy: First extend ENUM, then update data, then remove old values

-- Step 4a: Extend ENUM to include both old and new values
ALTER TABLE events
  MODIFY COLUMN status ENUM(
    'DRAFT',              -- Keep existing
    'PUBLISHED',          -- Old values
    'PENDING_APPROVAL',
    'APPROVED',
    'CONFIRMED',
    'QUOTE_PENDING',      -- Keep existing
    'COMPLETED',          -- Keep existing
    'CANCELLED',         -- Keep existing
    'QUOTE_APPROVED',    -- New values
    'QUOTE_REJECTED',
    'STAFFING',
    'READY'
  ) NOT NULL DEFAULT 'DRAFT';

-- Step 4b: Update existing data to new format
UPDATE events
SET status = CASE
    WHEN status = 'QUOTE_PENDING' THEN 'QUOTE_PENDING'
    WHEN status = 'PUBLISHED' THEN 'DRAFT'
    WHEN status = 'PENDING_APPROVAL' THEN 'DRAFT'
    WHEN status = 'APPROVED' THEN 'DRAFT'
    WHEN status = 'CONFIRMED' THEN 'READY'
    WHEN status = 'COMPLETED' THEN 'COMPLETED'
    WHEN status = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'DRAFT'
END;

-- Step 4c: Remove old values from ENUM (keep only new workflow values)
ALTER TABLE events
  MODIFY COLUMN status ENUM(
    'DRAFT',
    'QUOTE_PENDING',
    'QUOTE_APPROVED',
    'QUOTE_REJECTED',
    'STAFFING',
    'READY',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'DRAFT';

-- Step 5: Update participants table - add RSVP fields if missing
SET @col_exists6 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'participants'
    AND COLUMN_NAME = 'rsvp_status'
);

SET @sql6 = IF(@col_exists6 = 0,
    'ALTER TABLE participants ADD COLUMN rsvp_status ENUM(''PENDING'', ''CONFIRMED'', ''DECLINED'') NOT NULL DEFAULT ''PENDING'' AFTER status',
    'SELECT "Column rsvp_status already exists" AS message'
);

PREPARE stmt6 FROM @sql6;
EXECUTE stmt6;
DEALLOCATE PREPARE stmt6;

SET @col_exists7 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'participants'
    AND COLUMN_NAME = 'invited_via'
);

SET @sql7 = IF(@col_exists7 = 0,
    'ALTER TABLE participants ADD COLUMN invited_via ENUM(''SMS'', ''EMAIL'', ''NONE'') NOT NULL DEFAULT ''NONE'' AFTER rsvp_status',
    'SELECT "Column invited_via already exists" AS message'
);

PREPARE stmt7 FROM @sql7;
EXECUTE stmt7;
DEALLOCATE PREPARE stmt7;

SET @col_exists8 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'participants'
    AND COLUMN_NAME = 'invited_at'
);

SET @sql8 = IF(@col_exists8 = 0,
    'ALTER TABLE participants ADD COLUMN invited_at TIMESTAMP NULL AFTER invited_via',
    'SELECT "Column invited_at already exists" AS message'
);

PREPARE stmt8 FROM @sql8;
EXECUTE stmt8;
DEALLOCATE PREPARE stmt8;

SET @col_exists9 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'participants'
    AND COLUMN_NAME = 'responded_at'
);

SET @sql9 = IF(@col_exists9 = 0,
    'ALTER TABLE participants ADD COLUMN responded_at TIMESTAMP NULL AFTER invited_at',
    'SELECT "Column responded_at already exists" AS message'
);

PREPARE stmt9 FROM @sql9;
EXECUTE stmt9;
DEALLOCATE PREPARE stmt9;

-- Step 6: Update worker_profiles - add missing fields
SET @col_exists10 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'worker_profiles'
    AND COLUMN_NAME = 'id_number'
);

SET @sql10 = IF(@col_exists10 = 0,
    'ALTER TABLE worker_profiles ADD COLUMN id_number VARCHAR(20) NULL AFTER phone',
    'SELECT "Column id_number already exists" AS message'
);

PREPARE stmt10 FROM @sql10;
EXECUTE stmt10;
DEALLOCATE PREPARE stmt10;

SET @col_exists11 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'worker_profiles'
    AND COLUMN_NAME = 'city'
);

SET @sql11 = IF(@col_exists11 = 0,
    'ALTER TABLE worker_profiles ADD COLUMN city VARCHAR(100) NULL AFTER id_number',
    'SELECT "Column city already exists" AS message'
);

PREPARE stmt11 FROM @sql11;
EXECUTE stmt11;
DEALLOCATE PREPARE stmt11;

SET @col_exists12 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'worker_profiles'
    AND COLUMN_NAME = 'address'
);

SET @sql12 = IF(@col_exists12 = 0,
    'ALTER TABLE worker_profiles ADD COLUMN address VARCHAR(255) NULL AFTER city',
    'SELECT "Column address already exists" AS message'
);

PREPARE stmt12 FROM @sql12;
EXECUTE stmt12;
DEALLOCATE PREPARE stmt12;

SET @col_exists13 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'worker_profiles'
    AND COLUMN_NAME = 'birth_date'
);

SET @sql13 = IF(@col_exists13 = 0,
    'ALTER TABLE worker_profiles ADD COLUMN birth_date DATE NULL AFTER address',
    'SELECT "Column birth_date already exists" AS message'
);

PREPARE stmt13 FROM @sql13;
EXECUTE stmt13;
DEALLOCATE PREPARE stmt13;

SET @col_exists14 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'worker_profiles'
    AND COLUMN_NAME = 'notes'
);

SET @sql14 = IF(@col_exists14 = 0,
    'ALTER TABLE worker_profiles ADD COLUMN notes TEXT NULL AFTER birth_date',
    'SELECT "Column notes already exists" AS message'
);

PREPARE stmt14 FROM @sql14;
EXECUTE stmt14;
DEALLOCATE PREPARE stmt14;

-- Add skills column to worker_profiles if missing
SET @col_exists_skills = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'worker_profiles'
    AND COLUMN_NAME = 'skills'
);

SET @sql_skills = IF(@col_exists_skills = 0,
    'ALTER TABLE worker_profiles ADD COLUMN skills TEXT NULL AFTER city',
    'SELECT "Column skills already exists" AS message'
);

PREPARE stmt_skills FROM @sql_skills;
EXECUTE stmt_skills;
DEALLOCATE PREPARE stmt_skills;

-- Step 7: Add approval_status to users if missing
SET @col_exists15 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'approval_status'
);

SET @sql15 = IF(@col_exists15 = 0,
    'ALTER TABLE users ADD COLUMN approval_status ENUM(''PENDING_APPROVAL'', ''APPROVED'', ''REJECTED'') NULL AFTER is_active',
    'SELECT "Column approval_status already exists" AS message'
);

PREPARE stmt15 FROM @sql15;
EXECUTE stmt15;
DEALLOCATE PREPARE stmt15;

-- Set default approval status
UPDATE users
SET approval_status = CASE
    WHEN role = 'WORKER' AND is_active = 1 THEN 'PENDING_APPROVAL'
    WHEN role = 'WORKER' AND is_active = 0 THEN 'REJECTED'
    ELSE 'APPROVED'
END
WHERE approval_status IS NULL;

-- For existing active workers, set to APPROVED (grandfathered)
UPDATE users
SET approval_status = 'APPROVED'
WHERE role = 'WORKER' AND is_active = 1 AND approval_status = 'PENDING_APPROVAL';

-- Step 8: Create worker_event_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS worker_event_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    worker_id BIGINT NOT NULL,
    status ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP NULL,
    admin_note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_worker_event_requests_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_event_requests_worker
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY uq_worker_event_request (event_id, worker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes only if they don't exist
-- MySQL 8.0+ supports DROP INDEX IF EXISTS via ALTER TABLE
-- Check if indexes exist before creating them
SET @idx1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_event_requests' 
    AND index_name = 'idx_worker_event_requests_event_id');
SET @sql = IF(@idx1_exists = 0, 
    'CREATE INDEX idx_worker_event_requests_event_id ON worker_event_requests(event_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_event_requests' 
    AND index_name = 'idx_worker_event_requests_worker_id');
SET @sql = IF(@idx2_exists = 0, 
    'CREATE INDEX idx_worker_event_requests_worker_id ON worker_event_requests(worker_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_event_requests' 
    AND index_name = 'idx_worker_event_requests_status');
SET @sql = IF(@idx3_exists = 0, 
    'CREATE INDEX idx_worker_event_requests_status ON worker_event_requests(status)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 8b: Create worker_offers table if it doesn't exist (for WorkerOffer entity)
CREATE TABLE IF NOT EXISTS worker_offers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    quote_id BIGINT NOT NULL,
    worker_user_id BIGINT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    pay_amount DECIMAL(10,2) NULL,
    distance_km DECIMAL(6,2) NULL,
    offered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_worker_offers_quote
        FOREIGN KEY (quote_id) REFERENCES event_quotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_offers_worker
        FOREIGN KEY (worker_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY uq_worker_offer_quote_worker (quote_id, worker_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes only if they don't exist
SET @idx1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_offers' 
    AND index_name = 'idx_worker_offers_quote_id');
SET @sql = IF(@idx1_exists = 0, 
    'CREATE INDEX idx_worker_offers_quote_id ON worker_offers(quote_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_offers' 
    AND index_name = 'idx_worker_offers_worker_user_id');
SET @sql = IF(@idx2_exists = 0, 
    'CREATE INDEX idx_worker_offers_worker_user_id ON worker_offers(worker_user_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_offers' 
    AND index_name = 'idx_worker_offers_status');
SET @sql = IF(@idx3_exists = 0, 
    'CREATE INDEX idx_worker_offers_status ON worker_offers(status)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 9: Create worker_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS worker_assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    worker_id BIGINT NOT NULL,
    assignment_status ENUM('ASSIGNED', 'REMOVED') NOT NULL DEFAULT 'ASSIGNED',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_worker_assignments_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_assignments_worker
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY uq_worker_assignment (event_id, worker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes only if they don't exist
SET @idx1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_assignments' 
    AND index_name = 'idx_worker_assignments_event_id');
SET @sql = IF(@idx1_exists = 0, 
    'CREATE INDEX idx_worker_assignments_event_id ON worker_assignments(event_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_assignments' 
    AND index_name = 'idx_worker_assignments_worker_id');
SET @sql = IF(@idx2_exists = 0, 
    'CREATE INDEX idx_worker_assignments_worker_id ON worker_assignments(worker_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_assignments' 
    AND index_name = 'idx_worker_assignments_status');
SET @sql = IF(@idx3_exists = 0, 
    'CREATE INDEX idx_worker_assignments_status ON worker_assignments(assignment_status)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 10: Create worker_time_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS worker_time_entries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    worker_id BIGINT NOT NULL,
    event_id BIGINT NULL,
    work_date DATE NOT NULL,
    hours_decimal DECIMAL(5,2) NOT NULL,
    created_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id BIGINT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_worker_time_entries_worker
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_worker_time_entries_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
    CONSTRAINT fk_worker_time_entries_creator
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes only if they don't exist
SET @idx1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_time_entries' 
    AND index_name = 'idx_worker_time_entries_worker_id');
SET @sql = IF(@idx1_exists = 0, 
    'CREATE INDEX idx_worker_time_entries_worker_id ON worker_time_entries(worker_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_time_entries' 
    AND index_name = 'idx_worker_time_entries_event_id');
SET @sql = IF(@idx2_exists = 0, 
    'CREATE INDEX idx_worker_time_entries_event_id ON worker_time_entries(event_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'worker_time_entries' 
    AND index_name = 'idx_worker_time_entries_work_date');
SET @sql = IF(@idx3_exists = 0, 
    'CREATE INDEX idx_worker_time_entries_work_date ON worker_time_entries(work_date)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 11: Create notifications_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NULL,
    recipient_type ENUM('USER', 'PARTICIPANT', 'WORKER', 'CLIENT') NOT NULL,
    recipient_id BIGINT NULL,
    recipient_email VARCHAR(190) NULL,
    recipient_phone VARCHAR(30) NULL,
    channel ENUM('SMS', 'EMAIL') NOT NULL,
    message_text TEXT NOT NULL,
    status ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notifications_log_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes only if they don't exist
SET @idx1_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'notifications_log' 
    AND index_name = 'idx_notifications_log_event_id');
SET @sql = IF(@idx1_exists = 0, 
    'CREATE INDEX idx_notifications_log_event_id ON notifications_log(event_id)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'notifications_log' 
    AND index_name = 'idx_notifications_log_status');
SET @sql = IF(@idx2_exists = 0, 
    'CREATE INDEX idx_notifications_log_status ON notifications_log(status)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'notifications_log' 
    AND index_name = 'idx_notifications_log_channel');
SET @sql = IF(@idx3_exists = 0, 
    'CREATE INDEX idx_notifications_log_channel ON notifications_log(channel)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

