# เอกสารสรุปหน้าจอระบบ
# SuperArt Mobile Shop Management System

**เวอร์ชัน:** v2.4  
**วันที่จัดทำ:** 9 กันยายน 2569  
**ระบบ:** ระบบจัดการร้านซ่อมมือถือ SuperArt  
**URL (Production):** `https://repair.superartmobile.com`  
**URL (Local Dev):** `http://localhost:5173`

---

## สารบัญ

| หมายเลข | หน้าจอ | กลุ่ม | URL |
|---|---|---|---|
| 0.0 | หน้าเข้าสู่ระบบ | Auth | `/` |
| 0.1 | หน้าลืมรหัสผ่าน | Auth | `/forgot-password` |
| 1.0 | Dashboard | Admin | `/admin` |
| 2.0 | จัดการคลังสินค้า | Admin | `/admin/inventory` |
| 3.0 | ใบสั่งซ่อม | Admin | `/admin/orders` |
| 4.0 | ข้อมูลลูกค้า | Admin | `/admin/customers` |
| 5.0 | การชำระเงิน | Admin | `/admin/payments` |
| 6.0 | รายงาน | Admin | `/admin/reports` |
| 7.0 | ตั้งค่าการแจ้งเตือน | Admin | `/admin/settings/notifications` |
| 8.0 | ติดตามสถานะซ่อม (สาธารณะ) | Public | `/track` |
| 9.0 | แจ้งซ่อมออนไลน์ (สาธารณะ) | Public | `/repair-request` |

---

## กลุ่มที่ 1: Authentication (ระบบยืนยันตัวตน)

---

### หมายเลขหน้าจอ 0.0: หน้าเข้าสู่ระบบ (Login Page)

**ไฟล์:** `src/pages/auth/LoginPage.jsx`  
**URL:** `/`  
**สิทธิ์เข้าถึง:** สาธารณะ (ไม่ต้อง Login)

#### คำอธิบาย
หน้าแรกของระบบสำหรับเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน มีการออกแบบแบบ 2 Panel — ด้านซ้ายเป็น Branding Panel สีน้ำเงินเข้ม ด้านขวาเป็นฟอร์มเข้าสู่ระบบ

#### องค์ประกอบหน้าจอ

| องค์ประกอบ | รายละเอียด |
|---|---|
| Left Panel | Gradient สี `#0a1628 → #1a2e4a` พร้อมสโลแกนร้าน |
| โลโก้ SuperArt | ไอคอน Wrench + ชื่อแบรนด์ |
| ช่องอีเมล | `input type="email"` พร้อม icon Mail |
| ช่องรหัสผ่าน | `input type="password"` พร้อมปุ่ม show/hide |
| Checkbox | "จดจำการเข้าสู่ระบบ" |
| ลิงก์ลืมรหัสผ่าน | navigate ไป `/forgot-password` |
| ปุ่มเข้าสู่ระบบ | POST `/api/auth/login` |
| ปุ่มแจ้งซ่อมออนไลน์ | navigate ไป `/repair-request` |
| ปุ่มตรวจสอบสถานะ | navigate ไป `/track` |

#### การทำงาน (System Logic)

```
ผู้ใช้กรอก email + password
    → POST /api/auth/login
    → ตรวจสอบ users table
    → ถ้าถูกต้อง: รับ JWT Token → navigate /admin
    → ถ้าผิด: แสดงข้อความ "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
```

#### ผลลัพธ์ที่คาดหวัง (Expected Output States)

| กรณี | ผลลัพธ์ |
|---|---|
| ✅ Login สำเร็จ | Navigate ไปหน้า `/admin` (Dashboard) |
| ❌ อีเมล/รหัสผ่านผิด | แสดง error box สีแดง: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" |
| ❌ ไม่กรอกข้อมูล | แสดง error: "กรุณากรอกอีเมลและรหัสผ่าน" |
| ❌ Server ไม่ตอบสนอง | แสดง error: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" |

---

### หมายเลขหน้าจอ 0.1: หน้าลืมรหัสผ่าน (Forgot Password Page)

**ไฟล์:** `src/pages/auth/ForgotPasswordPage.jsx`  
**URL:** `/forgot-password`  
**สิทธิ์เข้าถึง:** สาธารณะ (ไม่ต้อง Login)  
**API Reference:** `FORM REF: AUTH-PW-01`

#### คำอธิบาย
หน้าสำหรับผู้ใช้ที่ลืมรหัสผ่าน กรอกอีเมลที่ลงทะเบียนเพื่อขอรับลิงก์รีเซ็ตรหัสผ่าน ระบบจะตรวจสอบฐานข้อมูลและส่งลิงก์ยืนยันไปยังอีเมลนั้น

#### องค์ประกอบหน้าจอ

| องค์ประกอบ | รายละเอียด |
|---|---|
| Left Panel | Gradient Navy `#0B132B → #1C2541 → #1e3a8a` |
| Badge | "ระบบความปลอดภัยบัญชีขั้นสูง" |
| หัวข้อ | "กู้คืนการเข้าถึงบัญชีผู้ใช้งาน" |
| คุณสมบัติความปลอดภัย | ส่งลิงก์ใน 1 นาที, หมดอายุใน 15 นาที, TLS 256-bit |
| Info Box | อธิบาย System Logic การทำงาน |
| ช่องอีเมล | `input type="email"` — รับแค่อีเมลเท่านั้น |
| ปุ่มส่ง | "ส่งลิงก์ตั้งรหัสผ่านใหม่ (Send Reset Link)" |
| ลิงก์กลับ | "กลับไปยังหน้าเข้าสู่ระบบ (Back to Login)" |
| Output States | แสดงผลสำเร็จ/ไม่พบอีเมล แบบ Real-time |

#### การทำงาน (System Logic)

```
ผู้ใช้กรอก email
    → POST /api/auth/forgot-password
    → ตรวจสอบ users table WHERE email = ?
    → ถ้าพบ: ส่ง Reset Link → แสดง Success State (สีเขียว)
    → ถ้าไม่พบ: แสดง Error State (สีเหลือง)
```

#### ผลลัพธ์ที่คาดหวัง (Expected Output States)

| กรณี | ผลลัพธ์ |
|---|---|
| ✅ พบอีเมลในระบบ | `"ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง [email] เรียบร้อยแล้ว"` |
| ⚠️ ไม่พบอีเมล | `"ไม่พบที่อยู่อีเมลนี้ในระบบ กรุณาตรวจสอบอีกครั้ง"` |
| ❌ ไม่กรอกอีเมล | `"กรุณากรอกที่อยู่อีเมล"` |

---

## กลุ่มที่ 2: Admin Panel (ระบบจัดการหลังบ้าน)

> **สิทธิ์เข้าถึง:** ต้อง Login ด้วย JWT Token ก่อนทุกหน้า

---

### หมายเลขหน้าจอ 1.0: Dashboard (แดชบอร์ดภาพรวม)

**ไฟล์:** `src/pages/admin/Dashboard.jsx`  
**URL:** `/admin`  
**API:** `GET /api/reports/dashboard`

#### คำอธิบาย
หน้าหลักของ Admin แสดงข้อมูลสรุปภาพรวมของร้านซ่อม ประกอบด้วย Stat Cards, กราฟรายได้รายเดือน และรายการงานซ่อมล่าสุด

#### องค์ประกอบหน้าจอ

| องค์ประกอบ | ข้อมูลที่แสดง |
|---|---|
| Stat Card — งานซ่อมทั้งหมด | จำนวน Order ทั้งหมดในระบบ |
| Stat Card — กำลังซ่อม | Order ที่มีสถานะ `repairing` |
| Stat Card — ซ่อมเสร็จ | Order ที่มีสถานะ `completed` |
| Stat Card — รายได้เดือนนี้ | ยอดรวม Payments เดือนปัจจุบัน |
| Bar Chart | รายได้ 6 เดือนย้อนหลัง (monthly_revenue) |
| ตารางงานซ่อมล่าสุด | 10 รายการล่าสุด พร้อมช่องค้นหา |

#### สถานะงานซ่อม (Status Badge)

| สถานะ | ความหมาย | สี |
|---|---|---|
| `received` | รับเครื่องแล้ว | เทา |
| `repairing` | กำลังซ่อม | เหลือง |
| `completed` | ซ่อมเสร็จ | เขียว |
| `delivered` | ส่งมอบแล้ว | น้ำเงิน |
| `cancelled` | ยกเลิก | แดง |

---

### หมายเลขหน้าจอ 2.0: คลังสินค้า (Inventory Management)

**ไฟล์:** `src/pages/admin/Inventory.jsx`  
**URL:** `/admin/inventory`  
**API:** `GET/POST/PUT/DELETE /api/products`

#### คำอธิบาย
จัดการสินค้าและอะไหล่ในร้าน เพิ่ม/แก้ไข/ลบสินค้า ดูสต็อกคงเหลือ

#### ฟังก์ชันหลัก

| ฟังก์ชัน | คำอธิบาย |
|---|---|
| แสดงรายการสินค้า | ตารางสินค้าทั้งหมดพร้อมสต็อก ราคา หมวดหมู่ |
| เพิ่มสินค้าใหม่ | Modal ฟอร์มกรอกข้อมูลสินค้า |
| แก้ไขสินค้า | แก้ไขรายการที่มีอยู่ |
| ลบสินค้า | ลบออกจากระบบ |
| ค้นหา/กรอง | ค้นหาตามชื่อ หมวดหมู่ |

---

### หมายเลขหน้าจอ 3.0: ใบสั่งซ่อม (Repair Orders)

**ไฟล์:** `src/pages/admin/RepairOrders.jsx`  
**URL:** `/admin/orders`  
**API:** `GET/POST/PUT/DELETE /api/repairs`

#### คำอธิบาย
ระบบจัดการใบสั่งซ่อมทั้งหมด ตั้งแต่รับเครื่อง ติดตามสถานะ จนถึงส่งมอบ

#### ฟังก์ชันหลัก

| ฟังก์ชัน | คำอธิบาย |
|---|---|
| สร้างใบสั่งซ่อมใหม่ | เปิด Order ใหม่พร้อมข้อมูลลูกค้าและอุปกรณ์ |
| อัปเดตสถานะ | เปลี่ยนสถานะงานซ่อม |
| บันทึก Timeline | บันทึกความคืบหน้าการซ่อม |
| เพิ่มอะไหล่ที่ใช้ | ระบุอะไหล่ที่ใช้ในการซ่อม |
| พิมพ์ใบงาน | Export เป็น PDF |
| แจ้งเตือนลูกค้า | ส่งแจ้งเตือนผ่าน Telegram |

#### รหัสงานซ่อม (Order Code Format)
```
RO-YYYY-XXXXX
ตัวอย่าง: RO-2026-00001
```

---

### หมายเลขหน้าจอ 4.0: ข้อมูลลูกค้า (Customers)

**ไฟล์:** `src/pages/admin/Customers.jsx`  
**URL:** `/admin/customers`  
**API:** `GET/POST/PUT/DELETE /api/customers`

#### คำอธิบาย
จัดการข้อมูลลูกค้าทั้งหมด ดูประวัติการซ่อม ข้อมูลการติดต่อ

#### ฟังก์ชันหลัก

| ฟังก์ชัน | คำอธิบาย |
|---|---|
| รายชื่อลูกค้า | ตารางลูกค้าทั้งหมด พร้อมค้นหา |
| เพิ่มลูกค้าใหม่ | Modal ฟอร์มข้อมูลลูกค้า |
| แก้ไขข้อมูล | อัปเดตข้อมูลลูกค้า |
| ประวัติงานซ่อม | ดูรายการซ่อมทั้งหมดของลูกค้า |

#### ข้อมูลที่จัดเก็บ

| Field | ประเภท | คำอธิบาย |
|---|---|---|
| `name` | VARCHAR | ชื่อ-นามสกุล |
| `phone` | VARCHAR | เบอร์โทรศัพท์ |
| `email` | VARCHAR | อีเมล (optional) |
| `line_id` | VARCHAR | Line ID (optional) |
| `address` | TEXT | ที่อยู่ |

---

### หมายเลขหน้าจอ 5.0: การชำระเงิน (Payments)

**ไฟล์:** `src/pages/admin/Payments.jsx`  
**URL:** `/admin/payments`  
**API:** `GET/POST/PUT /api/payments`

#### คำอธิบาย
จัดการการชำระเงินและใบเสร็จ รองรับหลายช่องทางการชำระ

#### ช่องทางการชำระเงิน

| ช่องทาง | รหัส |
|---|---|
| เงินสด | `cash` |
| โอนเงิน | `transfer` |
| QR Code | `qr` |
| บัตรเครดิต | `credit_card` |

#### ประเภทการชำระ

| ประเภท | รหัส | คำอธิบาย |
|---|---|---|
| ชำระเต็ม | `full` | ชำระทั้งหมดในครั้งเดียว |
| มัดจำ | `deposit` | ชำระบางส่วนก่อน |
| ค้างชำระ | `partial` | ค้างส่วนที่เหลือ |

---

### หมายเลขหน้าจอ 6.0: รายงาน (Reports)

**ไฟล์:** `src/pages/admin/Reports.jsx`  
**URL:** `/admin/reports`  
**API:** `GET /api/reports/*`

#### คำอธิบาย
หน้ารายงานและสถิติต่างๆ ของร้าน

#### รายงานที่มี

| รายงาน | API Endpoint | คำอธิบาย |
|---|---|---|
| รายได้ | `/api/reports/revenue` | รายได้รายวัน/รายเดือน |
| ประเภทงานซ่อม | `/api/reports/repair-types` | สัดส่วนประเภทการซ่อม |
| สินค้าขายดี | `/api/reports/top-products` | อะไหล่ที่ใช้มากที่สุด |
| งานยกเลิก | `/api/reports/cancellations` | สรุปงานที่ยกเลิก |
| ภาพรวม | `/api/reports/summary` | สรุปภาพรวมทั้งหมด |

---

### หมายเลขหน้าจอ 7.0: ตั้งค่าการแจ้งเตือน (Notification Settings)

**ไฟล์:** `src/pages/admin/NotificationSettings.jsx`  
**URL:** `/admin/settings/notifications`  
**API:** `GET/PUT /api/notifications`

#### คำอธิบาย
ตั้งค่าช่องทางการแจ้งเตือนลูกค้าและ Template ข้อความ

#### ช่องทางแจ้งเตือน

| ช่องทาง | สถานะ | รายละเอียด |
|---|---|---|
| SMS | เปิด/ปิด | ส่งผ่าน SMS Gateway |
| Telegram | เปิด/ปิด | ส่งผ่าน Telegram Bot |

#### Template ข้อความ

| Template | `template_key` | ทริกเกอร์ |
|---|---|---|
| แจ้งรับซ่อม | `repair_received` | เมื่อรับเครื่องแล้ว |
| ซ่อมเสร็จแล้ว | `repair_completed` | เมื่อซ่อมเสร็จ |
| แจ้งเตือนชำระ | `payment_reminder` | เตือนค้างชำระ |

**Variables ที่ใช้ใน Template:**
```
{{customer_name}}     ชื่อลูกค้า
{{order_code}}        รหัสงานซ่อม
{{device_brand}}      ยี่ห้ออุปกรณ์
{{device_model}}      รุ่นอุปกรณ์
{{estimated_cost}}    ราคาประเมิน
{{final_cost}}        ราคาจริง
{{outstanding_amount}} ยอดค้างชำระ
{{due_date}}          วันครบกำหนด
```

---

## กลุ่มที่ 3: Public Pages (หน้าสาธารณะ)

> **สิทธิ์เข้าถึง:** ไม่ต้อง Login (ลูกค้าทั่วไปเข้าได้)

---

### หมายเลขหน้าจอ 8.0: ติดตามสถานะซ่อม (Customer Tracking)

**ไฟล์:** `src/pages/public/CustomerTracking.jsx`  
**URL:** `/track`  
**API:** `GET /api/repairs/track/:order_code`

#### คำอธิบาย
หน้าสาธารณะให้ลูกค้าตรวจสอบสถานะงานซ่อมของตัวเอง โดยกรอกรหัสงานซ่อม

#### ขั้นตอนการใช้งาน
```
1. ลูกค้ากรอกรหัสงานซ่อม (เช่น RO-2026-00001)
2. ระบบค้นหาใน repair_orders table
3. แสดงสถานะ, ข้อมูลอุปกรณ์, และ Timeline การซ่อม
```

---

### หมายเลขหน้าจอ 9.0: แจ้งซ่อมออนไลน์ (Repair Request)

**ไฟล์:** `src/pages/public/RepairRequest.jsx`  
**URL:** `/repair-request`  
**API:** `POST /api/repairs/request`

#### คำอธิบาย
หน้าสาธารณะให้ลูกค้าแจ้งซ่อมล่วงหน้าออนไลน์ ระบบจะสร้างใบสั่งซ่อมเบื้องต้น

#### ข้อมูลที่กรอก

| Field | Required | คำอธิบาย |
|---|---|---|
| ชื่อ-นามสกุล | ✅ | ชื่อลูกค้า |
| เบอร์โทรศัพท์ | ✅ | ช่องทางติดต่อกลับ |
| ยี่ห้อ/รุ่นอุปกรณ์ | ✅ | อุปกรณ์ที่ต้องการซ่อม |
| อาการเสีย | ✅ | รายละเอียดปัญหา |
| อีเมล | ❌ | รับการแจ้งเตือน (optional) |

---

## โครงสร้าง Database

### ตารางในระบบ

| ตาราง | จำนวนคอลัมน์ | คำอธิบาย |
|---|---|---|
| `users` | 7 | บัญชีผู้ใช้งานระบบ |
| `customers` | 8 | ข้อมูลลูกค้า |
| `products` | 9 | สินค้า/อะไหล่ |
| `repair_orders` | 15 | ใบสั่งซ่อม |
| `repair_parts` | 6 | อะไหล่ที่ใช้ในงานซ่อม |
| `repair_timeline` | 5 | บันทึกความคืบหน้า |
| `payments` | 12 | ข้อมูลการชำระเงิน |
| `notification_settings` | 6 | ตั้งค่าการแจ้งเตือน |
| `message_templates` | 5 | Template ข้อความ |

---

## ข้อมูลสำหรับทดสอบระบบ

### บัญชีผู้ใช้งาน (Test Accounts)

| Role | Email | Password |
|---|---|---|
| 👑 Admin | `admin@superart.com` | `admin1234` |
| 👤 Staff | `test@superart.com` | *(รีเซ็ตผ่านหน้า Forgot Password)* |

### API Endpoints หลัก

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| POST | `/api/auth/forgot-password` | ส่งลิงก์รีเซ็ตรหัสผ่าน |
| GET | `/api/auth/me` | ดึงข้อมูลผู้ใช้ปัจจุบัน |
| GET | `/api/reports/dashboard` | ข้อมูล Dashboard |
| GET | `/api/customers` | รายชื่อลูกค้า |
| GET | `/api/repairs` | รายการใบสั่งซ่อม |
| GET | `/api/products` | รายการสินค้า |
| GET | `/api/payments` | รายการชำระเงิน |

---

## การตั้งค่าระบบ

### Environment Variables

**`/server/.env` (Backend)**
```env
DB_HOST=localhost
DB_NAME=superart_repair
DB_USER=root
DB_PASS=
PORT=3011
JWT_SECRET=superart_secret_key_2025
TELEGRAM_BOT_TOKEN=<token>
```

**`/.env` (Frontend)**
```env
VITE_API_URL=http://localhost:3011
```

### Tech Stack

| ส่วน | เทคโนโลยี | เวอร์ชัน |
|---|---|---|
| Frontend | React + Vite | 19.x / 7.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Node.js + Express | - |
| Database | MySQL | - |
| Auth | JWT (jsonwebtoken) | 7d expiry |
| Password | bcryptjs | salt=10 |
| Notification | Telegram Bot API | Polling mode |

---

*เอกสารนี้จัดทำโดย SuperArt Development Team*  
*© 2026 SuperArt Mobile Repair. All rights reserved.*
