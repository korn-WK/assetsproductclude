-- Update Acquired Date to include time
-- This script changes the acquired_date column from DATE to DATETIME

-- Step 1: Add a temporary column to store the converted data
ALTER TABLE assets ADD COLUMN acquired_date_temp DATETIME;

-- Step 2: Convert existing date values to datetime (set time to 00:00:00)
UPDATE assets SET acquired_date_temp = CONCAT(acquired_date, ' 00:00:00') WHERE acquired_date IS NOT NULL;

-- Step 3: Drop the old date column
ALTER TABLE assets DROP COLUMN acquired_date;

-- Step 4: Rename the temporary column to acquired_date
ALTER TABLE assets CHANGE acquired_date_temp acquired_date DATETIME DEFAULT NULL;

-- Step 5: Add comment to document the change
ALTER TABLE assets MODIFY COLUMN acquired_date DATETIME DEFAULT NULL COMMENT 'Asset acquisition date and time';

-- Step 6: Verify the change
SELECT 
    id, 
    asset_code, 
    name, 
    acquired_date,
    DATE(acquired_date) as date_only,
    TIME(acquired_date) as time_only
FROM assets 
LIMIT 5;

-- Step 7: Show table structure
DESCRIBE assets; 