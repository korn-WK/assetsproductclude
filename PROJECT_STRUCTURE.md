# 🏗️ Asset Management System - Project Structure

## 📁 **โครงสร้างโปรเจคใหม่**

```
frontend/src/
├── pages/
│   ├── admin/                    # หน้า Admin ทั้งหมด
│   │   ├── dashboard.tsx         # Admin Dashboard
│   │   ├── asset-management.tsx  # จัดการทรัพย์สิน
│   │   ├── user-management.tsx   # จัดการผู้ใช้
│   │   ├── department-management.tsx # จัดการแผนก
│   │   └── location-management.tsx   # จัดการสถานที่
│   ├── user/                     # หน้า User ทั้งหมด
│   │   ├── dashboard.tsx         # User Dashboard
│   │   ├── asset-browser.tsx     # ดูทรัพย์สิน
│   │   └── reports.tsx           # รายงาน
│   ├── auth/                     # หน้า Authentication
│   │   └── callback.tsx          # OAuth Callback
│   └── index.tsx                 # หน้าแรก
├── components/
│   ├── admin/                    # Components สำหรับ Admin
│   │   ├── AdminSidebar/         # Sidebar สำหรับ Admin
│   │   ├── AssetManagementTable/ # ตารางจัดการทรัพย์สิน
│   │   ├── UserManagementTable/  # ตารางจัดการผู้ใช้
│   │   └── AdminTable/           # ตาราง Admin ทั่วไป
│   ├── user/                     # Components สำหรับ User
│   │   ├── Sidebar/              # Sidebar สำหรับ User
│   │   ├── AssetsTable/          # ตารางแสดงทรัพย์สิน
│   │   └── DashboardContent/     # เนื้อหา Dashboard
│   ├── common/                   # Components ที่ใช้ร่วมกัน
│   │   ├── Navbar/               # Navigation Bar
│   │   ├── Pagination/           # การแบ่งหน้า
│   │   ├── DropdownSelect/       # Dropdown Select
│   │   └── FormModal/            # Modal สำหรับฟอร์ม
│   ├── auth/                     # Components สำหรับ Authentication
│   │   └── AdminRoute/           # Route Protection สำหรับ Admin
│   └── shared/                   # Components ที่ใช้ร่วมกัน
│       ├── AssetDetailPopup/     # Popup รายละเอียดทรัพย์สิน
│       └── DepartmentSelector/   # เลือกแผนก
├── contexts/                     # React Contexts
│   ├── AuthContext.tsx           # Authentication Context
│   ├── AssetContext.tsx          # Asset Management Context
│   └── DropdownContext.tsx       # Dropdown Data Context
├── lib/                          # Utility Libraries
│   ├── axios.ts                  # HTTP Client Configuration
│   ├── utils.ts                  # Utility Functions
│   └── pdfGenerator.js           # PDF Generation
├── styles/                       # Global Styles
│   └── globals.css               # Global CSS
└── theme/                        # Theme Configuration
```

## 🎯 **การตั้งชื่อไฟล์ใหม่**

### **Admin Pages (เดิม → ใหม่)**
- `admin-assets.tsx` → `admin/asset-management.tsx`
- `admin-dashboard.tsx` → `admin/dashboard.tsx`
- `admin-users.tsx` → `admin/user-management.tsx`
- `admin-departments.tsx` → `admin/department-management.tsx`
- `admin-locations.tsx` → `admin/location-management.tsx`

### **User Pages (เดิม → ใหม่)**
- `assets.tsx` → `user/asset-browser.tsx`
- `dashboard.tsx` → `user/dashboard.tsx`
- `reports.tsx` → `user/reports.tsx`

### **Components (เดิม → ใหม่)**
- `AdminAssetsTable/` → `admin/AssetManagementTable/`
- `UserManagementTable/` → `admin/UserManagementTable/`
- `AssetsTable/` → `user/AssetsTable/`
- `AdminSidebar/` → `admin/AdminSidebar/`
- `Sidebar/` → `user/Sidebar/`

## 🔄 **การอัปเดต Routes**

### **Admin Routes**
```typescript
// ใหม่
/admin/dashboard
/admin/asset-management
/admin/user-management
/admin/department-management
/admin/location-management
```

### **User Routes**
```typescript
// ใหม่
/user/dashboard
/user/asset-browser
/user/reports
```

## 📝 **ขั้นตอนการย้ายไฟล์**

1. **สร้างโฟลเดอร์ใหม่**
   - `pages/admin/`
   - `pages/user/`
   - `components/admin/`
   - `components/user/`
   - `components/common/`

2. **ย้ายไฟล์**
   - ย้ายไฟล์ admin ไปยัง `pages/admin/`
   - ย้ายไฟล์ user ไปยัง `pages/user/`
   - ย้าย components ไปยังโฟลเดอร์ที่เหมาะสม

3. **อัปเดต Imports**
   - แก้ไข import paths ในทุกไฟล์
   - อัปเดต route links ใน components

4. **อัปเดต Navigation**
   - แก้ไข links ใน Sidebar components
   - อัปเดต AdminSidebar navigation

## 🎨 **ประโยชน์ของโครงสร้างใหม่**

### **✅ ความชัดเจน**
- แยก admin และ user ให้ชัดเจน
- ชื่อไฟล์สื่อความหมายมากขึ้น
- ง่ายต่อการหาไฟล์

### **✅ การบำรุงรักษา**
- โครงสร้างเป็นระเบียบมากขึ้น
- ง่ายต่อการเพิ่มฟีเจอร์ใหม่
- ลดความซับซ้อน

### **✅ การทำงานเป็นทีม**
- แต่ละคนสามารถทำงานในส่วนของตัวเองได้
- ลดการ conflict
- ง่ายต่อการ code review

## 🚀 **การใช้งาน**

### **สำหรับ Developer**
```bash
# หน้า Admin
/admin/dashboard          # Admin Dashboard
/admin/asset-management   # จัดการทรัพย์สิน
/admin/user-management    # จัดการผู้ใช้

# หน้า User
/user/dashboard          # User Dashboard
/user/asset-browser      # ดูทรัพย์สิน
/user/reports           # รายงาน
```

### **สำหรับ User**
- **Admin**: เข้า `/admin/dashboard` เพื่อจัดการระบบ
- **User**: เข้า `/user/dashboard` เพื่อดูข้อมูล

## 📋 **Todo List**

- [x] ย้ายไฟล์ admin ทั้งหมดไปยัง `pages/admin/`
- [x] ย้ายไฟล์ user ทั้งหมดไปยัง `pages/user/`
- [x] สร้างโครงสร้างโฟลเดอร์ components ใหม่
- [x] อัปเดต imports ในทุกไฟล์
- [x] อัปเดต navigation links
- [x] ย้าย components ไปยังโฟลเดอร์ที่เหมาะสม
- [x] ทดสอบระบบหลังการย้าย
- [x] ลบไฟล์เก่าที่ย้ายแล้ว
- [x] อัปเดต documentation

## 🎯 **ขั้นตอนต่อไป**

1. **ย้าย Components**: ย้าย components ไปยังโฟลเดอร์ที่เหมาะสม
2. **ทดสอบระบบ**: ตรวจสอบว่า routes ใหม่ทำงานได้ถูกต้อง
3. **ลบไฟล์เก่า**: ลบไฟล์ที่ย้ายแล้วออก
4. **อัปเดต Documentation**: อัปเดต README และเอกสารอื่นๆ

## 🎯 **โครงสร้างใหม่ที่เสร็จสิ้นแล้ว**

### **✅ Pages Structure**
```
pages/
├── admin/
│   ├── dashboard.tsx ✅
│   ├── asset-management.tsx ✅
│   ├── user-management.tsx ✅
│   ├── department-management.tsx ✅
│   └── location-management.tsx ✅
├── user/
│   ├── dashboard.tsx ✅
│   ├── asset-browser.tsx ✅
│   └── reports.tsx ✅
└── index.tsx ✅
```

### **✅ Components Structure**
```
components/
├── admin/
│   ├── AdminSidebar.tsx ✅
│   └── AdminSidebar.module.css ✅
├── user/
│   ├── Sidebar.tsx ✅
│   └── Sidebar.module.css ✅
├── auth/
│   └── AdminRoute.tsx ✅
└── [other components remain in root for now]
```

### **✅ Routes ที่อัปเดตแล้ว**
- Admin: `/admin/*` ✅
- User: `/user/*` ✅
- Navigation links updated ✅

### **✅ ไฟล์ที่ลบแล้ว**
- `admin-assets.tsx` ✅
- `admin-dashboard.tsx` ✅
- `admin-users.tsx` ✅
- `admin-departments.tsx` ✅
- `admin-locations.tsx` ✅
- `assets.tsx` ✅
- `dashboard.tsx` ✅
- `reports.tsx` ✅

## 🎉 **สรุป**

การจัดโครงสร้างโปรเจคเสร็จสิ้นแล้ว! โปรเจคตอนนี้มี:
- โครงสร้างที่เป็นระเบียบและชัดเจน
- แยก admin และ user ให้ชัดเจน
- ง่ายต่อการบำรุงรักษาและขยาย
- Routes ที่เข้าใจง่ายและใช้งานสะดวก

---

**หมายเหตุ**: โครงสร้างนี้จะทำให้โปรเจคเป็นระเบียบและง่ายต่อการบำรุงรักษามากขึ้น 🎯 