-- Migration V44: Add final_price and admin_notes columns to event_quotes
-- Also update status column to support new statuses
-- Note: These columns may already exist from V31, so we check first

-- Add final_price column if it doesn't exist
SET @col_exists_final_price = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'event_quotes'
    AND COLUMN_NAME = 'final_price'
);

SET @sql_final_price = IF(@col_exists_final_price = 0,
    'ALTER TABLE event_quotes ADD COLUMN final_price DECIMAL(10,2) NULL AFTER quote_amount',
    'SELECT "Column final_price already exists" AS message'
);

PREPARE stmt_final_price FROM @sql_final_price;
EXECUTE stmt_final_price;
DEALLOCATE PREPARE stmt_final_price;

-- Add admin_notes column if it doesn't exist
SET @col_exists_admin_notes = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'event_quotes'
    AND COLUMN_NAME = 'admin_notes'
);

SET @sql_admin_notes = IF(@col_exists_admin_notes = 0,
    'ALTER TABLE event_quotes ADD COLUMN admin_notes TEXT NULL AFTER notes',
    'SELECT "Column admin_notes already exists" AS message'
);

PREPARE stmt_admin_notes FROM @sql_admin_notes;
EXECUTE stmt_admin_notes;
DEALLOCATE PREPARE stmt_admin_notes;

-- Update status column length to support longer status names (only if it's not already VARCHAR(50))
SET @col_status_type = (
    SELECT COLUMN_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'event_quotes'
    AND COLUMN_NAME = 'status'
);

SET @sql_status = IF(@col_status_type != 'varchar(50)',
    'ALTER TABLE event_quotes MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT ''DRAFT''',
    'SELECT "Column status already VARCHAR(50)" AS message'
);

PREPARE stmt_status FROM @sql_status;
EXECUTE stmt_status;
DEALLOCATE PREPARE stmt_status;
