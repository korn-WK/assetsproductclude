-- Check and fix image URLs in the assets table
-- This script will help identify and fix duplicate base URLs

-- First, let's see the current image_url values
SELECT '=== CURRENT IMAGE_URLS ===' as info;
SELECT 
    id,
    asset_code,
    name,
    image_url,
    CASE 
        WHEN image_url LIKE 'http://localhost:4000http://%' THEN 'DUPLICATE_BASE_URL'
        WHEN image_url LIKE 'https://localhost:4000https://%' THEN 'DUPLICATE_BASE_URL'
        WHEN image_url LIKE 'http://%' OR image_url LIKE 'https://%' THEN 'FULL_URL'
        WHEN image_url LIKE '/%' THEN 'RELATIVE_PATH'
        WHEN image_url IS NULL THEN 'NULL'
        ELSE 'UNKNOWN_FORMAT'
    END as url_type
FROM assets 
WHERE image_url IS NOT NULL
ORDER BY id;

-- Check for duplicate base URLs
SELECT '=== DUPLICATE BASE URLS ===' as info;
SELECT 
    id,
    asset_code,
    name,
    image_url,
    'DUPLICATE_BASE_URL' as issue
FROM assets 
WHERE image_url LIKE 'http://localhost:4000http://%' 
   OR image_url LIKE 'https://localhost:4000https://%'
   OR image_url LIKE 'http://localhost:4000https://%'
   OR image_url LIKE 'https://localhost:4000http://%';

-- Fix duplicate base URLs by removing the duplicate part
-- This will fix URLs like "http://localhost:4000http://localhost:4000/uploads/file.jpg"
-- to become "http://localhost:4000/uploads/file.jpg"

UPDATE assets 
SET image_url = REPLACE(image_url, 'http://localhost:4000http://', 'http://localhost:4000/')
WHERE image_url LIKE 'http://localhost:4000http://%';

UPDATE assets 
SET image_url = REPLACE(image_url, 'https://localhost:4000https://', 'https://localhost:4000/')
WHERE image_url LIKE 'https://localhost:4000https://%';

UPDATE assets 
SET image_url = REPLACE(image_url, 'http://localhost:4000https://', 'https://localhost:4000/')
WHERE image_url LIKE 'http://localhost:4000https://%';

UPDATE assets 
SET image_url = REPLACE(image_url, 'https://localhost:4000http://', 'http://localhost:4000/')
WHERE image_url LIKE 'https://localhost:4000http://%';

-- Check the results after fixing
SELECT '=== AFTER FIXING DUPLICATE URLS ===' as info;
SELECT 
    id,
    asset_code,
    name,
    image_url,
    CASE 
        WHEN image_url LIKE 'http://localhost:4000http://%' THEN 'STILL_DUPLICATE'
        WHEN image_url LIKE 'https://localhost:4000https://%' THEN 'STILL_DUPLICATE'
        WHEN image_url LIKE 'http://%' OR image_url LIKE 'https://%' THEN 'FULL_URL'
        WHEN image_url LIKE '/%' THEN 'RELATIVE_PATH'
        WHEN image_url IS NULL THEN 'NULL'
        ELSE 'UNKNOWN_FORMAT'
    END as url_type
FROM assets 
WHERE image_url IS NOT NULL
ORDER BY id;

-- Show summary of URL types
SELECT '=== URL TYPE SUMMARY ===' as info;
SELECT 
    CASE 
        WHEN image_url LIKE 'http://localhost:4000http://%' THEN 'DUPLICATE_BASE_URL'
        WHEN image_url LIKE 'https://localhost:4000https://%' THEN 'DUPLICATE_BASE_URL'
        WHEN image_url LIKE 'http://%' OR image_url LIKE 'https://%' THEN 'FULL_URL'
        WHEN image_url LIKE '/%' THEN 'RELATIVE_PATH'
        WHEN image_url IS NULL THEN 'NULL'
        ELSE 'UNKNOWN_FORMAT'
    END as url_type,
    COUNT(*) as count
FROM assets 
GROUP BY 
    CASE 
        WHEN image_url LIKE 'http://localhost:4000http://%' THEN 'DUPLICATE_BASE_URL'
        WHEN image_url LIKE 'https://localhost:4000https://%' THEN 'DUPLICATE_BASE_URL'
        WHEN image_url LIKE 'http://%' OR image_url LIKE 'https://%' THEN 'FULL_URL'
        WHEN image_url LIKE '/%' THEN 'RELATIVE_PATH'
        WHEN image_url IS NULL THEN 'NULL'
        ELSE 'UNKNOWN_FORMAT'
    END
ORDER BY count DESC; 