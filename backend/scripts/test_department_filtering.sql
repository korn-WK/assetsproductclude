-- Test script for department filtering system
-- Run this after setting up the department filtering feature

-- 1. Check current users and their departments
SELECT 
    u.id,
    u.username,
    u.name,
    u.department_id,
    d.name_th as department_name
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
ORDER BY u.id;

-- 2. Check assets and their departments
SELECT 
    a.id,
    a.asset_code,
    a.name,
    a.department_id,
    d.name_th as department_name
FROM assets a
LEFT JOIN departments d ON a.department_id = d.id
ORDER BY a.department_id, a.id;

-- 3. Test: Set a user to department 1 (if exists)
-- UPDATE users SET department_id = 1 WHERE id = 1;

-- 4. Test: Set a user to department 2 (if exists)
-- UPDATE users SET department_id = 2 WHERE id = 2;

-- 5. Test: Set a user to see all departments
-- UPDATE users SET department_id = NULL WHERE id = 3;

-- 6. Count assets by department
SELECT 
    d.name_th as department_name,
    COUNT(a.id) as asset_count
FROM departments d
LEFT JOIN assets a ON d.id = a.department_id
GROUP BY d.id, d.name_th
ORDER BY d.name_th;

-- 7. Count users by department
SELECT 
    d.name_th as department_name,
    COUNT(u.id) as user_count
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
GROUP BY d.id, d.name_th
ORDER BY d.name_th;

-- 8. Users with no department (can see all assets)
SELECT 
    u.id,
    u.username,
    u.name
FROM users u
WHERE u.department_id IS NULL; 