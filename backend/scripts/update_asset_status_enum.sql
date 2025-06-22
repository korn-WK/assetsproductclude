-- Update Asset Status Enum - อัปเดตสถานะครุภัณฑ์
-- Run this script to update your existing database to support the new status types

-- Step 1: Update the enum definition in the assets table
ALTER TABLE `assets` 
MODIFY COLUMN `status` enum('active','transferring','audited','missing','broken','disposed') DEFAULT 'active';

-- Step 2: Update any existing 'transferred' status to 'transferring' (if any exist)
UPDATE `assets` 
SET `status` = 'transferring' 
WHERE `status` = 'transferred';

-- Step 3: Update any empty status values to 'active'
UPDATE `assets` 
SET `status` = 'active' 
WHERE `status` = '' OR `status` IS NULL;

-- Step 4: Verify the update
SELECT `status`, COUNT(*) as count 
FROM `assets` 
GROUP BY `status` 
ORDER BY `status`;

-- Step 5: Show sample data to verify
SELECT `id`, `asset_code`, `name`, `status` 
FROM `assets` 
LIMIT 10; 