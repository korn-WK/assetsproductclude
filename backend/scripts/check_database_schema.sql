-- Check database schema for assets table
-- Run this to understand the current structure

-- Check assets table structure
DESCRIBE assets;

-- Check departments table structure
DESCRIBE departments;

-- Check users table structure
DESCRIBE users;

-- Check sample data in assets table
SELECT 
    id,
    asset_code,
    name,
    description,
    location,
    department_id,
    owner_id,
    status,
    image_url,
    acquired_date,
    created_at,
    updated_at
FROM assets 
LIMIT 5;

-- Check sample data in departments table
SELECT 
    id,
    name_th,
    name_en
FROM departments 
LIMIT 5;

-- Check sample data in users table
SELECT 
    id,
    name,
    username,
    email,
    department_id
FROM users 
LIMIT 5;

-- Check foreign key relationships
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'assets'
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Check if there are any assets with department_id or owner_id
SELECT 
    COUNT(*) as total_assets,
    COUNT(department_id) as assets_with_department,
    COUNT(owner_id) as assets_with_owner
FROM assets;

-- Check departments that exist
SELECT 
    d.id,
    d.name_th,
    COUNT(a.id) as asset_count
FROM departments d
LEFT JOIN assets a ON d.id = a.department_id
GROUP BY d.id, d.name_th
ORDER BY d.name_th;

-- Check users that exist
SELECT 
    u.id,
    u.name,
    u.username,
    COUNT(a.id) as asset_count
FROM users u
LEFT JOIN assets a ON u.id = a.owner_id
GROUP BY u.id, u.name, u.username
ORDER BY u.name; 