# 🛠️ Tech Stack — SuperArt Mobile Shop Management System

> รายการเทคโนโลยีทั้งหมดที่ใช้ในโปรเจกต์นี้

---

## ⚡ Frontend

| เทคโนโลยี | เวอร์ชัน | บทบาท |
|-----------|---------|-------|
| **React** | ^19.2.4 | UI Framework หลัก |
| **React DOM** | ^19.2.4 | Render React components ลงบน DOM |
| **React Router DOM** | ^6.30.3 | Client-side Routing (SPA) |
| **Vite** | ^7.3.1 | Build Tool & Dev Server |
| **TailwindCSS** | ^3.4.19 | Utility-first CSS Framework |
| **Axios** | ^1.13.5 | HTTP Client สำหรับเรียก API |
| **Lucide React** | ^0.575.0 | Icon Library |
| **Recharts** | ^3.7.0 | Charts & Data Visualization |
| **jsPDF** | ^4.2.0 | Export PDF |
| **html2canvas** | ^1.4.1 | แปลง HTML เป็น Canvas (ใช้คู่กับ jsPDF) |
| **html-to-image** | ^1.11.13 | แปลง HTML element เป็นรูปภาพ |

---

## 🖥️ Backend

| เทคโนโลยี | เวอร์ชัน | บทบาท |
|-----------|---------|-------|
| **Node.js** | LTS | JavaScript Runtime สำหรับ Server |
| **Express** | ^5.2.1 | Web Framework / REST API |
| **MySQL2** | ^3.18.0 | MySQL Database Driver |
| **JSON Web Token (JWT)** | ^9.0.3 | Authentication & Authorization |
| **bcryptjs** | ^3.0.3 | Password Hashing |
| **Multer** | ^2.0.2 | File Upload (รูปภาพ, สลิป) |
| **@line/bot-sdk** | ^10.6.0 | Telegram Bot Integration |
| **dotenv** | ^17.3.1 | Environment Variables |
| **cors** | ^2.8.6 | Cross-Origin Resource Sharing |

---

## 🗄️ Database

| เทคโนโลยี | รายละเอียด |
|-----------|-----------|
| **MySQL** | Relational Database |
| **Charset** | utf8mb4 / utf8mb4_unicode_ci |
| **Engine** | InnoDB |
| **จำนวนตาราง** | 9 ตาราง |

---

## 🔧 Dev Tools

| เครื่องมือ | เวอร์ชัน | บทบาท |
|-----------|---------|-------|
| **nodemon** | ^3.1.14 | Auto-reload server ระหว่าง development |
| **PostCSS** | ^8.5.6 | CSS Processing (ใช้คู่กับ Tailwind) |
| **Autoprefixer** | ^10.4.24 | เติม CSS vendor prefix อัตโนมัติ |
| **TypeScript** | ~5.9.3 | Type checking (config เท่านั้น) |
| **@vitejs/plugin-react** | ^5.2.0 | Vite plugin สำหรับ React (JSX/HMR) |

---

## 🌐 Third-Party Services

| บริการ | บทบาท |
|--------|-------|
| **Telegram Bot API** | ส่งการแจ้งเตือนให้ลูกค้าผ่าน Telegram |
| **SMS API** | ส่ง SMS แจ้งเตือนลูกค้า (ต้องกรอก API Key) |

---

## 📁 สรุปโดยย่อ

```
Frontend  →  React 19 + Vite + TailwindCSS
Backend   →  Node.js + Express 5
Database  →  MySQL
Auth      →  JWT + bcryptjs
Notify    →  Telegram Bot (Polling) + SMS
Export    →  jsPDF + html2canvas
```

---

*SuperArt Mobile Shop Management System — 2026*
