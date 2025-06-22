-- Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name_th` varchar(255) NOT NULL COMMENT 'Department name in Thai',
  `name_en` varchar(255) NOT NULL COMMENT 'Department name in English',
  `description` text DEFAULT NULL COMMENT 'Department description',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create asset_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS `asset_locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Location name',
  `description` text DEFAULT NULL COMMENT 'Location description',
  `address` text DEFAULT NULL COMMENT 'Location address',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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