# Troubleshooting Guide

## ปัญหาที่พบและวิธีแก้ไข

### 1. Backend Server Crash

**ปัญหา**: `TypeError: argument handler must be a function`

**สาเหตุ**: ฟังก์ชัน `getAssetStats` ไม่ได้ถูก export ออกจาก `assetController.js`

**วิธีแก้ไข**:

```javascript
// ใน backend/controllers/assetController.js
module.exports = {
  // ... existing exports
  getAssetStats: getStats, // เพิ่ม alias สำหรับ getAssetStats
};
```

### 2. PowerShell Command Syntax

**ปัญหา**: `&&` ไม่ใช่ valid statement separator ใน PowerShell

**วิธีแก้ไข**: ใช้คำสั่งแยกกัน

```powershell
# แทนที่จะใช้: cd backend && npm start
# ให้ใช้:
cd backend
npm start

# หรือใช้:
cd frontend
npm run dev
```

### 3. การรันเซิร์ฟเวอร์

#### Backend Server

```powershell
cd backend
npm start
```

- รันที่ port 4000
- ใช้ nodemon สำหรับ auto-restart

#### Frontend Server

```powershell
cd frontend
npm run dev
```

- รันที่ port 3000
- ใช้ Next.js development server

### 4. การตรวจสอบสถานะเซิร์ฟเวอร์

#### ตรวจสอบ Backend (Port 4000)

```powershell
netstat -ano | findstr :4000
```

#### ตรวจสอบ Frontend (Port 3000)

```powershell
netstat -ano | findstr :3000
```

### 5. API Endpoints ที่เพิ่มใหม่

#### Dashboard Stats API

- **URL**: `GET /api/assets/stats`
- **Authentication**: Required
- **Response**:
  ```json
  {
    "totalAssets": 150,
    "activeAssets": 120,
    "brokenAssets": 15,
    "missingAssets": 5,
    "monthlyData": [...]
  }
  ```

### 6. การทดสอบ Dashboard

1. เข้าสู่ระบบที่ `http://localhost:3000`
2. ไปที่หน้า Dashboard
3. ตรวจสอบว่าข้อมูลแสดงถูกต้อง
4. ตรวจสอบ loading และ error states

### 7. การแก้ไขปัญหาเพิ่มเติม

#### หาก Backend ไม่เริ่มต้น

```powershell
# ตรวจสอบ dependencies
cd backend
npm install

# ลองรันใหม่
npm start
```

#### หาก Frontend ไม่เริ่มต้น

```powershell
# ตรวจสอบ dependencies
cd frontend
npm install

# ลองรันใหม่
npm run dev
```

#### หากมีปัญหาเรื่อง Database

- ตรวจสอบการเชื่อมต่อ database ใน `backend/config/database.js`
- ตรวจสอบว่าตารางถูกสร้างแล้ว

### 8. Logs และ Debugging

#### Backend Logs

- ดู console output ของ backend server
- ตรวจสอบ error messages ใน terminal

#### Frontend Logs

- เปิด Developer Tools (F12)
- ดู Console tab สำหรับ JavaScript errors
- ดู Network tab สำหรับ API calls

### 9. การ Restart เซิร์ฟเวอร์

หากต้องการ restart เซิร์ฟเวอร์:

1. กด `Ctrl+C` ใน terminal ที่รันเซิร์ฟเวอร์
2. รันคำสั่ง `npm start` หรือ `npm run dev` อีกครั้ง

### 10. การแก้ไขปัญหา Dashboard

หาก dashboard ไม่แสดงข้อมูล:

1. ตรวจสอบ Network tab ใน Developer Tools
2. ดูว่า API call ไปที่ `/api/assets/stats` สำเร็จหรือไม่
3. ตรวจสอบ authentication token
4. ตรวจสอบ console errors
