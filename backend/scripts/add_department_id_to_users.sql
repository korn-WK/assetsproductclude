-- Add department_id column to users table if it doesn't exist
-- This script should be run to add department_id support to the users table

-- Check if department_id column exists, if not add it
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department_id INT NULL,
ADD CONSTRAINT fk_users_department 
FOREIGN KEY (department_id) REFERENCES departments(id) 
ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- Update existing users to have NULL department_id (they will see all assets)
-- You can manually update specific users later with their department_id
UPDATE users SET department_id = NULL WHERE department_id IS NULL; 