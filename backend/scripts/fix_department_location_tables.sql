-- Fix departments table - add missing columns if they don't exist
ALTER TABLE `departments` 
ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL COMMENT 'Department description' AFTER `name_en`,
ADD COLUMN IF NOT EXISTS `created_at` datetime DEFAULT current_timestamp() AFTER `description`,
ADD COLUMN IF NOT EXISTS `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp() AFTER `created_at`;

-- Fix asset_locations table - add missing columns if they don't exist
ALTER TABLE `asset_locations` 
ADD COLUMN IF NOT EXISTS `description` text DEFAULT NULL COMMENT 'Location description' AFTER `name`,
ADD COLUMN IF NOT EXISTS `address` text DEFAULT NULL COMMENT 'Location address' AFTER `description`,
ADD COLUMN IF NOT EXISTS `created_at` datetime DEFAULT current_timestamp() AFTER `address`,
ADD COLUMN IF NOT EXISTS `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp() AFTER `created_at`;

-- Insert sample departments if table is empty
INSERT IGNORE INTO `departments` (`name_th`, `name_en`, `description`) VALUES
('สำนักงานอธิการบดี', 'Office of the President', 'สำนักงานอธิการบดีมหาวิทยาลัยแม่ฟ้าหลวง'),
('คณะวิศวกรรมศาสตร์', 'School of Engineering', 'คณะวิศวกรรมศาสตร์ มหาวิทยาลัยแม่ฟ้าหลวง'),
('คณะวิทยาศาสตร์', 'School of Science', 'คณะวิทยาศาสตร์ มหาวิทยาลัยแม่ฟ้าหลวง'),
('คณะศิลปศาสตร์', 'School of Liberal Arts', 'คณะศิลปศาสตร์ มหาวิทยาลัยแม่ฟ้าหลวง'),
('คณะบริหารธุรกิจ', 'School of Management', 'คณะบริหารธุรกิจ มหาวิทยาลัยแม่ฟ้าหลวง'),
('คณะเทคโนโลยีสารสนเทศ', 'School of Information Technology', 'คณะเทคโนโลยีสารสนเทศ มหาวิทยาลัยแม่ฟ้าหลวง');

-- Insert sample locations if table is empty
INSERT IGNORE INTO `asset_locations` (`name`, `description`, `address`) VALUES
('อาคารบริหาร M-1', 'อาคารบริหารหลักของมหาวิทยาลัย', 'มหาวิทยาลัยแม่ฟ้าหลวง ตำบลท่าสุด อำเภอเมือง จังหวัดเชียงราย'),
('อาคารเรียนรวม C-1', 'อาคารเรียนรวมสำหรับคณะต่างๆ', 'มหาวิทยาลัยแม่ฟ้าหลวง ตำบลท่าสุด อำเภอเมือง จังหวัดเชียงราย'),
('อาคารห้องปฏิบัติการ L-1', 'อาคารห้องปฏิบัติการวิทยาศาสตร์', 'มหาวิทยาลัยแม่ฟ้าหลวง ตำบลท่าสุด อำเภอเมือง จังหวัดเชียงราย'),
('อาคารศูนย์คอมพิวเตอร์ IT-1', 'อาคารศูนย์คอมพิวเตอร์และเทคโนโลยีสารสนเทศ', 'มหาวิทยาลัยแม่ฟ้าหลวง ตำบลท่าสุด อำเภอเมือง จังหวัดเชียงราย'),
('อาคารหอสมุด L-2', 'อาคารหอสมุดกลางมหาวิทยาลัย', 'มหาวิทยาลัยแม่ฟ้าหลวง ตำบลท่าสุด อำเภอเมือง จังหวัดเชียงราย');

-- Show the updated table structures
DESCRIBE departments;
DESCRIBE asset_locations; 