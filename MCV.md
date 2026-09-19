# 📱 SuperArt Mobile Shop Management System — MCV Document

> **Minimum Complete Viable (MCV)** — เอกสารสรุปภาพรวมระบบทั้งหมด ครอบคลุมสถาปัตยกรรม, ฟีเจอร์, โครงสร้างฐานข้อมูล, และ API ที่พร้อมใช้งานจริง

---

## 1. ภาพรวมระบบ (System Overview)

**SuperArt Mobile Shop Management System** คือระบบจัดการร้านซ่อมมือถือครบวงจร สำหรับร้าน SuperArt ที่รองรับการบริหารงานซ่อม, คลังสินค้า, ลูกค้า, การชำระเงิน, และการแจ้งเตือนผ่าน Telegram

| รายการ | รายละเอียด |
|--------|-----------|
| ชื่อโปรเจกต์ | Super Art Mobile Shop Management System |
| ประเภทแอป | Web Application (SPA + REST API) |
| สถาปัตยกรรม | **Frontend**: React 19 + Vite · **Backend**: Node.js + Express 5 · **DB**: MySQL |
| เวอร์ชัน | 0.0.0 (Development) |
| สร้างเมื่อ | 2026-03-07 |

---

## 2. Tech Stack

### Frontend
| เทคโนโลยี | เวอร์ชัน | บทบาท |
|-----------|---------|-------|
| React | ^19.2.4 | UI Framework |
| React Router DOM | ^6.30.3 | Client-side Routing |
| Vite | ^7.3.1 | Build Tool / Dev Server |
| TailwindCSS | ^3.4.19 | Styling |
| Axios | ^1.13.5 | HTTP Client |
| Lucide React | ^0.575.0 | Icon Library |
| Recharts | ^3.7.0 | Charts & Graphs |
| jsPDF + html2canvas | ^4.2.0 / ^1.4.1 | PDF Export |

### Backend
| เทคโนโลยี | เวอร์ชัน | บทบาท |
|-----------|---------|-------|
| Node.js + Express | ^5.2.1 | REST API Server |
| MySQL2 | ^3.18.0 | Database Driver |
| JSON Web Token | ^9.0.3 | Authentication |
| bcryptjs | ^3.0.3 | Password Hashing |
| Multer | ^2.0.2 | File Upload |
| @line/bot-sdk | ^10.6.0 | Telegram Integration |
| dotenv | ^17.3.1 | Environment Config |
| nodemon | ^3.1.14 | Dev Auto-reload |

---

## 3. โครงสร้างโปรเจกต์ (Project Structure)

```
Super Art Mobile Shop Management System/
├── index.html                    # HTML entry point
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
├── package.json                  # Frontend dependencies
│
├── src/                          # Frontend source
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Root component + Router
│   ├── index.css                 # Global styles
│   ├── api/
│   │   └── config.js             # Axios base URL config
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.jsx   # Admin layout wrapper
│   │   │   ├── AdminSidebar.jsx  # Navigation sidebar
│   │   │   └── AdminTopbar.jsx   # Top navigation bar
│   │   ├── shared/               # Shared components
│   │   └── ui/                   # UI primitives
│   └── pages/
│       ├── auth/
│       │   ├── LoginPage.jsx
│       │   └── ForgotPasswordPage.jsx
│       ├── admin/
│       │   ├── Dashboard.jsx
│       │   ├── RepairOrders.jsx  # (ไฟล์ใหญ่สุด ~77KB)
│       │   ├── Payments.jsx      # (~56KB)
│       │   ├── Reports.jsx       # (~36KB)
│       │   ├── Customers.jsx     # (~33KB)
│       │   ├── Inventory.jsx     # (~20KB)
│       │   └── NotificationSettings.jsx
│       └── public/
│           ├── CustomerTracking.jsx  # ติดตามสถานะซ่อม (ไม่ต้อง login)
│           └── RepairRequest.jsx     # แจ้งซ่อมออนไลน์ (ไม่ต้อง login)
│
└── server/                       # Backend source
    ├── server.js                 # Express app entry point (port 5000)
    ├── package.json              # Backend dependencies
    ├── .env                      # Environment variables
    ├── config/                   # DB config
    ├── database/
    │   └── schema.sql            # MySQL schema + seed data
    ├── middleware/
    │   ├── auth.js               # JWT verification middleware
    │   └── upload.js             # Multer file upload config
    ├── controllers/
    │   ├── authController.js
    │   ├── customerController.js
    │   ├── productController.js
    │   ├── repairController.js
    │   ├── paymentController.js
    │   ├── reportController.js
    │   └── notificationController.js
    ├── routes/
    │   ├── auth.js
    │   ├── products.js
    │   ├── customers.js
    │   ├── repairs.js
    │   ├── payments.js
    │   ├── reports.js
    │   ├── notifications.js
    │   └── telegramWebhook.js
    ├── services/
    │   ├── telegramPoller.js     # Telegram polling service
    │   └── telegramService.js    # Telegram message sender
    └── uploads/                  # Uploaded files (photos, slips)
```

---

## 4. ฐานข้อมูล (Database Schema)

**Database:** `superart_repair` (MySQL, charset: utf8mb4)

### ตารางทั้งหมด (9 ตาราง)

```
users ──────────────────────────────────────────────── (ผู้ใช้งานระบบ)
customers ──────────────────────────────────────────── (ลูกค้า)
products ───────────────────────────────────────────── (สินค้า/อะไหล่)
repair_orders ──────────┬── repair_parts ────────────── (ใบงานซ่อม + อะไหล่ที่ใช้)
                        └── repair_timeline ─────────── (ประวัติสถานะ)
payments ───────────────────────────────────────────── (การชำระเงิน)
notification_settings ──────────────────────────────── (ตั้งค่าการแจ้งเตือน)
message_templates ──────────────────────────────────── (แม่แบบข้อความ)
```

### รายละเอียดตาราง

#### `users` — ผู้ใช้งานระบบ
| คอลัมน์ | ชนิด | หมายเหตุ |
|--------|------|---------|
| id | INT UNSIGNED PK | Auto increment |
| email | VARCHAR(255) UNIQUE | อีเมลล็อกอิน |
| password | VARCHAR(255) | bcrypt hashed |
| full_name | VARCHAR(150) | ชื่อ-นามสกุล |
| role | ENUM | `admin`, `technician`, `staff` |
| avatar_url | VARCHAR(500) | รูปโปรไฟล์ |
| created_at | DATETIME | วันที่สร้าง |

**ข้อมูลเริ่มต้น:** admin@superart.com (password: `admin123`) · test@superart.com (password: `test1234`)

---

#### `customers` — ข้อมูลลูกค้า
| คอลัมน์ | ชนิด | หมายเหตุ |
|--------|------|---------|
| id | INT UNSIGNED PK | |
| customer_code | VARCHAR(20) UNIQUE | รหัสลูกค้า เช่น `CUS-0001` |
| full_name | VARCHAR(150) | |
| phone | VARCHAR(20) | |
| line_id | VARCHAR(100) | LINE ID |
| telegram_chat_id | VARCHAR(100) | สำหรับส่งแจ้งเตือน Telegram |
| email | VARCHAR(255) | |
| member_level | ENUM | `bronze`, `silver`, `gold`, `platinum` |
| total_spent | DECIMAL(12,2) | ยอดใช้จ่ายรวม |
| visit_count | INT | จำนวนครั้งที่มารับบริการ |

---

#### `products` — สินค้า/อะไหล่
| คอลัมน์ | ชนิด | หมายเหตุ |
|--------|------|---------|
| product_code | VARCHAR(30) UNIQUE | รหัสสินค้า เช่น `PRD-0001` |
| name | VARCHAR(200) | ชื่อสินค้า |
| category | ENUM | `screen`, `battery`, `accessories`, `cable`, `case`, `other` |
| cost_price | DECIMAL(10,2) | ราคาต้นทุน |
| sell_price | DECIMAL(10,2) | ราคาขาย |
| quantity | INT | จำนวนในคลัง |
| low_stock_threshold | INT | เกณฑ์เตือนสินค้าใกล้หมด |
| status | ENUM | `in_stock`, `low_stock`, `out_of_stock` |

---

#### `repair_orders` — ใบงานซ่อม
| คอลัมน์ | ชนิด | หมายเหตุ |
|--------|------|---------|
| order_code | VARCHAR(30) UNIQUE | รหัสงาน เช่น `SA-2025-0001` |
| customer_id | FK → customers | |
| device_type / brand / model / color / imei | VARCHAR | ข้อมูลอุปกรณ์ |
| symptoms | TEXT | อาการเสีย |
| symptom_tags | JSON | แท็กอาการ |
| technician_notes | TEXT | บันทึกช่าง |
| urgency | ENUM | `normal`, `urgent`, `express` |
| status | ENUM | `received` → `repairing` → `completed` → `delivered` / `cancelled` |
| estimated_cost / final_cost / service_charge | DECIMAL | ราคาซ่อม |
| before_photo / after_photo | VARCHAR(500) | รูปก่อน/หลังซ่อม |
| appointment_date / estimated_completion | DATETIME/DATE | วันนัด/กำหนดซ่อมเสร็จ |

---

#### `payments` — การชำระเงิน
| คอลัมน์ | ชนิด | หมายเหตุ |
|--------|------|---------|
| receipt_code | VARCHAR(30) UNIQUE | รหัสใบเสร็จ เช่น `RCP-2025-0001` |
| repair_order_id | FK → repair_orders | |
| customer_id | FK → customers | |
| amount / discount / total_amount | DECIMAL | ยอดเงิน |
| payment_type | ENUM | `full`, `partial`, `deposit` |
| payment_method | ENUM | `cash`, `transfer`, `qr`, `credit_card` |
| payment_slip_url | VARCHAR(500) | รูปสลิป |
| status | ENUM | `pending`, `paid`, `overdue`, `cancelled` |

---

#### `notification_settings` — ตั้งค่าการแจ้งเตือน
| channel | is_enabled | หมายเหตุ |
|---------|-----------|---------|
| `sms` | 1 (เปิด) | SMS API |
| `telegram` | 0 (ปิด) | Telegram Bot |

---

#### `message_templates` — แม่แบบข้อความ
| template_key | ชื่อ |
|-------------|------|
| `repair_received` | แจ้งรับซ่อม |
| `repair_completed` | ซ่อมเสร็จแล้ว |
| `payment_reminder` | แจ้งเตือนชำระ |

---

## 5. API Endpoints

**Base URL:** `http://localhost:5000/api`

### 🔐 Authentication (`/auth`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | เข้าสู่ระบบ | ❌ |
| POST | `/auth/logout` | ออกจากระบบ | ✅ |
| GET | `/auth/me` | ข้อมูล user ปัจจุบัน | ✅ |

### 📦 Products / Inventory (`/products`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/products` | รายการสินค้าทั้งหมด | ✅ |
| POST | `/products` | เพิ่มสินค้าใหม่ | ✅ |
| PUT | `/products/:id` | แก้ไขสินค้า | ✅ |
| DELETE | `/products/:id` | ลบสินค้า | ✅ |

### 👥 Customers (`/customers`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/customers` | รายการลูกค้าทั้งหมด | ✅ |
| GET | `/customers/:id` | ข้อมูลลูกค้า + ประวัติ | ✅ |
| POST | `/customers` | เพิ่มลูกค้าใหม่ | ✅ |
| PUT | `/customers/:id` | แก้ไขข้อมูลลูกค้า | ✅ |
| DELETE | `/customers/:id` | ลบลูกค้า | ✅ |

### 🔧 Repair Orders (`/repairs`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/repairs` | รายการใบงานซ่อม | ✅ |
| GET | `/repairs/:id` | รายละเอียดใบงาน | ✅ |
| POST | `/repairs` | สร้างใบงานซ่อมใหม่ | ✅ |
| PUT | `/repairs/:id` | แก้ไขใบงานซ่อม | ✅ |
| PATCH | `/repairs/:id/status` | อัปเดตสถานะงาน | ✅ |
| DELETE | `/repairs/:id` | ลบใบงานซ่อม | ✅ |
| GET | `/repairs/track/:orderCode` | ติดตามงานโดย order code | ❌ |
| POST | `/repairs/request` | ลูกค้าแจ้งซ่อมออนไลน์ | ❌ |

### 💳 Payments (`/payments`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/payments` | รายการชำระเงิน | ✅ |
| POST | `/payments` | บันทึกการชำระเงิน | ✅ |
| PUT | `/payments/:id` | แก้ไขรายการชำระ | ✅ |
| PATCH | `/payments/:id/verify` | ยืนยันการชำระ | ✅ |

### 📊 Reports (`/reports`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/reports/summary` | สรุปรายงานภาพรวม | ✅ |
| GET | `/reports/revenue` | รายงานรายได้ | ✅ |
| GET | `/reports/repairs` | รายงานงานซ่อม | ✅ |
| GET | `/reports/customers` | รายงานลูกค้า | ✅ |

### 🔔 Notifications (`/notifications`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/notifications/settings` | ดูการตั้งค่าการแจ้งเตือน | ✅ |
| PUT | `/notifications/settings` | อัปเดตการตั้งค่า | ✅ |
| GET | `/notifications/templates` | รายการ template ข้อความ | ✅ |
| PUT | `/notifications/templates/:id` | แก้ไข template | ✅ |
| POST | `/notifications/send` | ส่งข้อความทดสอบ | ✅ |

### 🤖 Telegram (`/telegram`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/telegram/webhook` | รับ webhook จาก Telegram | ❌ |

> **หมายเหตุ:** ระบบใช้ **Telegram Polling** แทน Webhook (รองรับ LAN / non-public server) — บริการ `telegramPoller.js` จะเริ่มทำงานอัตโนมัติเมื่อ server.js เริ่ม

---

## 6. เส้นทาง Frontend (Routing)

### Admin Routes (ต้องเข้าสู่ระบบ)
| Path | Component | คำอธิบาย |
|------|-----------|---------|
| `/` | `LoginPage` | หน้าเข้าสู่ระบบ |
| `/forgot-password` | `ForgotPasswordPage` | ลืมรหัสผ่าน |
| `/admin` | `Dashboard` | แดชบอร์ดหลัก |
| `/admin/inventory` | `Inventory` | จัดการคลังสินค้า |
| `/admin/orders` | `RepairOrders` | จัดการใบงานซ่อม |
| `/admin/customers` | `Customers` | จัดการลูกค้า |
| `/admin/payments` | `Payments` | จัดการการชำระเงิน |
| `/admin/reports` | `Reports` | รายงานและสถิติ |
| `/admin/settings/notifications` | `NotificationSettings` | ตั้งค่าการแจ้งเตือน |

### Public Routes (ไม่ต้องเข้าสู่ระบบ)
| Path | Component | คำอธิบาย |
|------|-----------|---------|
| `/track` | `CustomerTracking` | ลูกค้าติดตามสถานะซ่อมด้วยตนเอง |
| `/repair-request` | `RepairRequest` | ลูกค้าแจ้งซ่อมออนไลน์ |

---

## 7. ฟีเจอร์หลัก (Core Features)

### 🖥️ Dashboard
- สรุปสถิติงานซ่อมรายวัน/รายเดือน
- แสดงยอดรายได้, จำนวนงานตามสถานะ
- กราฟด้วย Recharts

### 🔧 ระบบใบงานซ่อม (Repair Orders)
- รับเครื่อง → ซ่อม → ซ่อมเสร็จ → ส่งมอบ
- บันทึกข้อมูลอุปกรณ์ครบถ้วน (ยี่ห้อ, รุ่น, IMEI, สีเครื่อง)
- ระดับความเร่งด่วน: ปกติ / ด่วน / เร่งด่วนพิเศษ
- บันทึกรูปก่อน-หลังซ่อม
- Timeline ประวัติการเปลี่ยนสถานะ
- จัดการอะไหล่ที่ใช้ต่อใบงาน

### 📦 คลังสินค้า (Inventory)
- จัดการสินค้า/อะไหล่
- แจ้งเตือนสินค้าต่ำกว่าเกณฑ์ (low stock)
- หมวดหมู่: จอ, แบตเตอรี่, อุปกรณ์เสริม, สาย, เคส, อื่นๆ
- อัปโหลดรูปสินค้า

### 👥 จัดการลูกค้า (Customers)
- ระบบสมาชิก 4 ระดับ: Bronze / Silver / Gold / Platinum
- ติดตามยอดใช้จ่ายสะสมและจำนวนครั้งที่รับบริการ
- บันทึก LINE ID และ Telegram Chat ID สำหรับแจ้งเตือน
- ดูประวัติการซ่อมและการชำระเงินของลูกค้า

### 💳 การชำระเงิน (Payments)
- รูปแบบ: ชำระเต็ม / ชำระบางส่วน / มัดจำ
- วิธีชำระ: เงินสด / โอน / QR / บัตรเครดิต
- อัปโหลดสลิปการชำระ
- ยืนยันการชำระเงินโดยแอดมิน
- Export ใบเสร็จเป็น PDF

### 📊 รายงาน (Reports)
- รายงานรายได้ (รายวัน/เดือน/ปี)
- สถิติงานซ่อมตามประเภทและสถานะ
- รายงานลูกค้าและระดับสมาชิก
- Export รายงานเป็น PDF

### 🔔 การแจ้งเตือน (Notifications)
- รองรับ SMS และ Telegram Bot
- แม่แบบข้อความสำหรับ: แจ้งรับซ่อม, ซ่อมเสร็จ, แจ้งชำระ
- รองรับตัวแปรใน template: `{{customer_name}}`, `{{order_code}}`, `{{final_cost}}` เป็นต้น
- Telegram ใช้ **Long Polling** (ไม่ต้อง public URL)

### 🌐 หน้าสาธารณะ (Public Pages)
- **ติดตามสถานะ** (`/track`): ลูกค้ากรอกรหัสงานเพื่อดูสถานะซ่อมแบบ Real-time
- **แจ้งซ่อมออนไลน์** (`/repair-request`): ลูกค้ากรอกข้อมูลอุปกรณ์และอาการผ่านเว็บ

---

## 8. ความปลอดภัย (Security)

| รายการ | รายละเอียด |
|--------|-----------|
| Authentication | JWT (JSON Web Token) |
| Password | bcryptjs hashing |
| Middleware | `auth.js` ตรวจสอบ JWT ทุก protected route |
| File Upload | Multer — จำกัดประเภทและขนาดไฟล์ |
| CORS | เปิด `origin: true, credentials: true` |

---

## 9. การตั้งค่า Environment Variables

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000
```

### Backend (`server/.env`)
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=superart_repair
JWT_SECRET=your_jwt_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

---

## 10. การติดตั้งและรันระบบ (Setup & Run)

### 1. ติดตั้ง Frontend
```bash
npm install
npm run dev          # Dev server → http://localhost:5173
```

### 2. ติดตั้ง Backend
```bash
cd server
npm install
npm run dev          # API server → http://localhost:5000
```

### 3. ตั้งค่าฐานข้อมูล
```bash
# สร้าง database และ tables จาก schema
mysql -u root -p < server/database/schema.sql
```

### 4. Seed Data เริ่มต้น
- ผู้ใช้งาน: 2 คน (admin + staff)
- ลูกค้า: 5 คน
- สินค้า: 6 รายการ
- ใบงานซ่อม: 5 ใบ (ทุกสถานะ)
- การชำระเงิน: 4 รายการ
- Template ข้อความ: 3 รายการ

---

## 11. สรุปสถานะ MCV

| ฟีเจอร์ | สถานะ |
|--------|-------|
| ระบบ Login / JWT Auth | ✅ พร้อมใช้งาน |
| Dashboard + Charts | ✅ พร้อมใช้งาน |
| จัดการใบงานซ่อม | ✅ พร้อมใช้งาน |
| คลังสินค้า | ✅ พร้อมใช้งาน |
| จัดการลูกค้า + ระดับสมาชิก | ✅ พร้อมใช้งาน |
| การชำระเงิน + Export PDF | ✅ พร้อมใช้งาน |
| รายงาน + Export PDF | ✅ พร้อมใช้งาน |
| แจ้งเตือน Telegram | ✅ พร้อมใช้งาน (Polling) |
| แจ้งเตือน SMS | ⚙️ ตั้งค่าไว้ (ต้องกรอก API Key จริง) |
| หน้าลูกค้าติดตามงาน (Public) | ✅ พร้อมใช้งาน |
| หน้าแจ้งซ่อมออนไลน์ (Public) | ✅ พร้อมใช้งาน |
| อัปโหลดรูปภาพ | ✅ พร้อมใช้งาน |

---

*เอกสารนี้สร้างขึ้นเมื่อ 2026-09-04 — SuperArt Mobile Shop Management System*
