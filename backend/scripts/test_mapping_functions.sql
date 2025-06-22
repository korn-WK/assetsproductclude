-- Test mapping functions with actual database data
-- Run this to verify that the mapping works correctly

-- Test 1: Check departments table
SELECT '=== DEPARTMENTS TABLE ===' as test_info;
SELECT id, name_th, name_en FROM departments ORDER BY id;

-- Test 2: Check users table
SELECT '=== USERS TABLE ===' as test_info;
SELECT id, name, username, department_id FROM users ORDER BY id;

-- Test 3: Test department mapping
SELECT '=== DEPARTMENT MAPPING TEST ===' as test_info;
SELECT 
    'ส่วนพัสดุ' as input_name,
    (SELECT id FROM departments WHERE name_th = 'ส่วนพัสดุ') as expected_id,
    (SELECT name_th FROM departments WHERE id = 1) as expected_name;

SELECT 
    'IT Department' as input_name,
    (SELECT id FROM departments WHERE name_en = 'IT Department') as expected_id,
    (SELECT name_th FROM departments WHERE id = 2) as expected_name;

-- Test 4: Test user mapping
SELECT '=== USER MAPPING TEST ===' as test_info;
SELECT 
    'สมศักดิ์ รักครุภัณฑ์' as input_name,
    (SELECT id FROM users WHERE name = 'สมศักดิ์ รักครุภัณฑ์') as expected_id,
    (SELECT name FROM users WHERE id = 101) as expected_name;

SELECT 
    'มานี มีของ' as input_name,
    (SELECT id FROM users WHERE name = 'มานี มีของ') as expected_id,
    (SELECT name FROM users WHERE id = 102) as expected_name;

-- Test 5: Check current assets with their department and owner info
SELECT '=== CURRENT ASSETS WITH MAPPING ===' as test_info;
SELECT 
    a.id,
    a.asset_code,
    a.name,
    a.department_id,
    d.name_th as department_name,
    a.owner_id,
    u.name as owner_name,
    a.status
FROM assets a
LEFT JOIN departments d ON a.department_id = d.id
LEFT JOIN users u ON a.owner_id = u.id
ORDER BY a.id;

-- Test 6: Test reverse mapping (ID to name)
SELECT '=== REVERSE MAPPING TEST ===' as test_info;
SELECT 
    1 as department_id,
    (SELECT name_th FROM departments WHERE id = 1) as department_name,
    101 as user_id,
    (SELECT name FROM users WHERE id = 101) as user_name;

-- Test 7: Check for any assets with missing department or owner
SELECT '=== ASSETS WITH MISSING MAPPING ===' as test_info;
SELECT 
    a.id,
    a.asset_code,
    a.name,
    CASE 
        WHEN a.department_id IS NULL THEN 'MISSING'
        WHEN d.id IS NULL THEN 'INVALID ID'
        ELSE 'OK'
    END as department_status,
    CASE 
        WHEN a.owner_id IS NULL THEN 'MISSING'
        WHEN u.id IS NULL THEN 'INVALID ID'
        ELSE 'OK'
    END as owner_status
FROM assets a
LEFT JOIN departments d ON a.department_id = d.id
LEFT JOIN users u ON a.owner_id = u.id
WHERE a.department_id IS NULL OR a.owner_id IS NULL 
   OR d.id IS NULL OR u.id IS NULL; 