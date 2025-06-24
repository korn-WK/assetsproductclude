# Dashboard Data Integration

## สรุปการเชื่อมต่อข้อมูล Dashboard

### การเปลี่ยนแปลงที่ทำ

#### 1. Backend API

- **เพิ่ม Route**: `/api/assets/stats` ใน `backend/routes/asset.js`
- **ปรับปรุง Controller**: `getAssetStats` ใน `backend/controllers/assetController.js`
  - รองรับการดึงข้อมูลตาม department ของ user
  - Admin สามารถดูข้อมูลของทุก department
  - คำนวณสถิติ: Total, Active, Broken, Missing Assets
  - สร้างข้อมูลรายเดือนสำหรับกราฟ (6 เดือนล่าสุด)

#### 2. Frontend Context

- **สร้าง DashboardContext**: `frontend/src/contexts/DashboardContext.tsx`
  - จัดการ state ของ dashboard stats
  - จัดการ loading และ error states
  - มี retry logic สำหรับ network errors

#### 3. Dashboard Components

- **ปรับปรุง DashboardContent**: `frontend/src/components/common/DashboardContent/index.tsx`
  - ใช้ข้อมูลจริงแทน mock data
  - แสดง loading และ error states
  - เชื่อมต่อกับ DashboardContext

#### 4. Dashboard Pages

- **ปรับปรุง User Dashboard**: `frontend/src/pages/user/dashboard.tsx`
  - เพิ่ม DashboardProvider
  - เรียกใช้ fetchStats เมื่อโหลดหน้า
- **ปรับปรุง Admin Dashboard**: `frontend/src/pages/admin/dashboard.tsx`
  - ใช้ DashboardContent เดียวกัน
  - Admin จะเห็นข้อมูลของทุก department

### ฟีเจอร์ที่ได้

#### สำหรับ User ปกติ

- ดูสถิติเฉพาะ department ของตัวเอง
- แสดงจำนวน assets ทั้งหมด, active, broken, missing
- กราฟแสดงการเพิ่ม assets รายเดือน

#### สำหรับ Admin

- ดูสถิติของทุก department
- ภาพรวมของระบบทั้งหมด
- ข้อมูลเดียวกันแต่ครอบคลุมทั้งระบบ

### API Response Format

```json
{
  "totalAssets": 150,
  "activeAssets": 120,
  "brokenAssets": 15,
  "missingAssets": 5,
  "monthlyData": [
    { "month": "Jan", "count": 10 },
    { "month": "Feb", "count": 15 },
    { "month": "Mar", "count": 8 },
    { "month": "Apr", "count": 12 },
    { "month": "May", "count": 20 },
    { "month": "Jun", "count": 18 }
  ]
}
```

### การใช้งาน

1. หน้า dashboard จะโหลดข้อมูลอัตโนมัติเมื่อเข้าถึง
2. แสดง loading indicator ขณะโหลดข้อมูล
3. แสดง error message หากมีปัญหา
4. ข้อมูลจะอัปเดตตามสิทธิ์ของ user (department-based หรือ admin)

### การทดสอบ

- รัน backend: `cd backend && npm start`
- รัน frontend: `cd frontend && npm run dev`
- เข้าสู่ระบบและไปที่หน้า dashboard
- ตรวจสอบว่าข้อมูลแสดงถูกต้องตามสิทธิ์ของ user
