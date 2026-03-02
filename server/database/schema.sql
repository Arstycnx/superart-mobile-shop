-- ============================================================
-- SuperArt Mobile Repair Shop - Full Database Schema
-- Database: superart_repair
-- ============================================================

CREATE DATABASE IF NOT EXISTS superart_repair CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE superart_repair;

-- ============================================================
-- 1. USERS (admin/staff accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(150) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  full_name    VARCHAR(100) NOT NULL,
  role         ENUM('admin','technician','staff') DEFAULT 'staff',
  avatar_url   VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  customer_code   VARCHAR(20) NOT NULL UNIQUE,
  full_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  line_id         VARCHAR(100),
  email           VARCHAR(150),
  member_level    ENUM('bronze','silver','gold','platinum') DEFAULT 'bronze',
  total_spent     DECIMAL(12,2) DEFAULT 0.00,
  visit_count     INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 3. PRODUCTS (spare parts / accessories)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  product_code        VARCHAR(50) NOT NULL UNIQUE,
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  category            ENUM('screen','battery','accessories','cable','case','other') NOT NULL DEFAULT 'other',
  cost_price          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sell_price          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantity            INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  image_url           VARCHAR(255),
  status              ENUM('in_stock','low_stock','out_of_stock') DEFAULT 'in_stock',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 4. REPAIR ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_orders (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  order_code            VARCHAR(30) NOT NULL UNIQUE,
  customer_id           INT NOT NULL,
  device_type           VARCHAR(50),
  device_brand          VARCHAR(100),
  device_model          VARCHAR(100),
  device_color          VARCHAR(50),
  device_imei           VARCHAR(50),
  symptoms              TEXT,
  symptom_tags          JSON,
  technician_notes      TEXT,
  urgency               ENUM('normal','urgent','express') DEFAULT 'normal',
  status                ENUM('received','repairing','completed','delivered','cancelled') DEFAULT 'received',
  estimated_cost        DECIMAL(10,2) DEFAULT 0.00,
  final_cost            DECIMAL(10,2) DEFAULT 0.00,
  service_charge        DECIMAL(10,2) DEFAULT 0.00,
  before_photo          VARCHAR(255),
  after_photo           VARCHAR(255),
  estimated_completion  DATE,
  received_date         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_date        TIMESTAMP NULL,
  delivered_date        TIMESTAMP NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 5. REPAIR PARTS (parts used in each repair order)
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_parts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  repair_order_id INT NOT NULL,
  product_id      INT NOT NULL,
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)      REFERENCES products(id)      ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 6. REPAIR TIMELINE (status history log)
-- ============================================================
CREATE TABLE IF NOT EXISTS repair_timeline (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  repair_order_id INT NOT NULL,
  status          VARCHAR(50) NOT NULL,
  description     TEXT,
  updated_by      VARCHAR(100),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  receipt_code      VARCHAR(30) NOT NULL UNIQUE,
  repair_order_id   INT NOT NULL,
  customer_id       INT NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  discount          DECIMAL(10,2) DEFAULT 0.00,
  total_amount      DECIMAL(10,2) NOT NULL,
  payment_type      ENUM('full','partial','deposit') DEFAULT 'full',
  payment_method    ENUM('cash','transfer','qr','credit_card') DEFAULT 'cash',
  payment_slip_url  VARCHAR(255),
  status            ENUM('pending','paid','overdue','cancelled') DEFAULT 'pending',
  verified_by       VARCHAR(100),
  verified_at       TIMESTAMP NULL,
  payment_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id)     REFERENCES customers(id)     ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 8. NOTIFICATION SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  channel      ENUM('sms','line') NOT NULL UNIQUE,
  is_enabled   TINYINT(1) DEFAULT 0,
  api_key      VARCHAR(255),
  sender_name  VARCHAR(100),
  access_token VARCHAR(255),
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 9. MESSAGE TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  template_key VARCHAR(100) NOT NULL UNIQUE,
  message_text TEXT NOT NULL,
  is_active    TINYINT(1) DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user (password: admin123)
INSERT IGNORE INTO users (email, password, full_name, role) VALUES
('admin@superart.com', '$2a$10$8K1p/a0dR1xqM8k.W1BKSO7ygCGhSMHqzQGUj1lfmPbNqJFZGpXa', 'ผู้ดูแลระบบ', 'admin');

-- Customers
INSERT IGNORE INTO customers (customer_code, full_name, phone, line_id, email, member_level, total_spent, visit_count) VALUES
('CUST-0001', 'สมชาย ใจดี',      '0812345678', 'somchai_j',   'somchai@gmail.com',   'gold',     4800.00, 5),
('CUST-0002', 'นิดา มีสุข',       '0823456789', 'nida_m',      'nida@hotmail.com',    'silver',   1500.00, 2),
('CUST-0003', 'อนุชา วงศ์สว่าง',  '0834567890', NULL,          NULL,                  'bronze',    900.00, 1),
('CUST-0004', 'วิภา ทองดี',       '0845678901', 'wipa_t',      'wipa@gmail.com',      'platinum', 12500.00, 10),
('CUST-0005', 'กิตติ์ ศรีสมบัติ', '0856789012', 'kitti_sri',   'kitti@outlook.com',   'silver',   2200.00, 3);

-- Products (spare parts)
INSERT IGNORE INTO products (product_code, name, category, cost_price, sell_price, quantity, low_stock_threshold, status) VALUES
('PRD-0001', 'จอ iPhone 13 (OEM)',          'screen',      1800.00, 2800.00, 12, 3, 'in_stock'),
('PRD-0002', 'แบตเตอรี่ Samsung A54',       'battery',      350.00,  650.00,  8, 3, 'in_stock'),
('PRD-0003', 'จอ Samsung S23 (AMOLED)',     'screen',      2500.00, 4200.00,  4, 3, 'in_stock'),
('PRD-0004', 'แบตเตอรี่ iPhone 14',         'battery',      450.00,  750.00,  2, 3, 'low_stock'),
('PRD-0005', 'สายชาร์จ USB-C ของแท้',      'cable',         80.00,  200.00, 30, 5, 'in_stock'),
('PRD-0006', 'เคสใส Xiaomi Redmi Note 12', 'case',          40.00,  120.00,  0, 5, 'out_of_stock');

-- Repair Orders
INSERT IGNORE INTO repair_orders
  (order_code, customer_id, device_type, device_brand, device_model, device_color, symptoms, symptom_tags, urgency, status, estimated_cost, final_cost, service_charge, estimated_completion, received_date, completed_date)
VALUES
('SA-2025-0001', 1, 'smartphone', 'Apple',   'iPhone 13',        'ดำ',   'หน้าจอแตก ทัชสกรีนไม่ทำงาน',  '["จอแตก","ทัชไม่ทำงาน"]',  'normal',  'completed',  2800.00, 2800.00, 200.00, '2025-02-20', '2025-02-18 10:00:00', '2025-02-20 15:00:00'),
('SA-2025-0002', 2, 'smartphone', 'Samsung', 'Galaxy A54',       'ขาว',  'แบตเตอรี่บวม ชาร์จไม่เข้า',   '["แบตบวม","ชาร์จไม่เข้า"]', 'urgent',  'completed',   650.00,  650.00, 150.00, '2025-02-22', '2025-02-21 09:30:00', '2025-02-22 12:00:00'),
('SA-2025-0003', 3, 'smartphone', 'Xiaomi',  'Redmi Note 12',    'น้ำเงิน','หน้าจอมีเส้น ภาพกระตุก',      '["หน้าจอเส้น","ภาพกระตุก"]','normal',  'repairing',  1500.00,    0.00,   0.00, '2025-02-26', '2025-02-23 14:00:00', NULL),
('SA-2025-0004', 4, 'smartphone', 'Apple',   'iPhone 14',        'ทอง',  'แบตเตอรี่หมดเร็ว เครื่องร้อน', '["แบตหมดเร็ว","เครื่องร้อน"]','express','received',   750.00,    0.00,   0.00, '2025-02-25', '2025-02-24 11:00:00', NULL),
('SA-2025-0005', 5, 'smartphone', 'Samsung', 'Galaxy S23',       'เทา',  'จอแตกมุม ยังใช้งานได้',        '["จอแตก"]',                  'normal',  'received',  4200.00,    0.00,   0.00, '2025-02-28', '2025-02-24 16:30:00', NULL);

-- Repair Timeline
INSERT INTO repair_timeline (repair_order_id, status, description, updated_by) VALUES
(1, 'received',   'รับซ่อมเครื่องเรียบร้อย ตรวจสอบความเสียหายเบื้องต้น', 'admin@superart.com'),
(1, 'repairing',  'เปลี่ยนจอ iPhone 13 OEM เสร็จสมบูรณ์', 'admin@superart.com'),
(1, 'completed',  'ตรวจสอบคุณภาพผ่าน พร้อมรับเครื่อง', 'admin@superart.com'),
(2, 'received',   'รับซ่อม แบตเตอรี่บวมรุนแรง', 'admin@superart.com'),
(2, 'repairing',  'เปลี่ยนแบตเตอรี่ Samsung A54 ใหม่', 'admin@superart.com'),
(2, 'completed',  'ทดสอบแบตเตอรี่ปกติ พร้อมรับเครื่อง', 'admin@superart.com'),
(3, 'received',   'รับซ่อม ตรวจสอบปัญหาหน้าจอ', 'admin@superart.com'),
(3, 'repairing',  'กำลังซ่อม รอชิ้นส่วน', 'admin@superart.com'),
(4, 'received',   'รับซ่อม ประเมินราคาเบื้องต้นแล้ว', 'admin@superart.com'),
(5, 'received',   'รับซ่อม ถ่ายรูปความเสียหายก่อนซ่อม', 'admin@superart.com');

-- Repair Parts used
INSERT INTO repair_parts (repair_order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 1, 2800.00, 2800.00),
(2, 2, 1,  650.00,  650.00);

-- Payments
INSERT IGNORE INTO payments (receipt_code, repair_order_id, customer_id, amount, discount, total_amount, payment_type, payment_method, status, verified_by, verified_at) VALUES
('REC-2025-0001', 1, 1, 3000.00, 0.00, 3000.00, 'full', 'cash',     'paid', 'admin@superart.com', '2025-02-20 16:00:00'),
('REC-2025-0002', 2, 2,  800.00, 0.00,  800.00, 'full', 'transfer', 'paid', 'admin@superart.com', '2025-02-22 13:00:00'),
('REC-2025-0003', 3, 3,  500.00, 0.00,  500.00, 'deposit', 'qr',    'paid', 'admin@superart.com', '2025-02-23 14:30:00'),
('REC-2025-0004', 4, 4,    0.00, 0.00,    0.00, 'full', 'cash',     'pending', NULL, NULL);

-- Notification Settings
INSERT IGNORE INTO notification_settings (channel, is_enabled, api_key, sender_name, access_token) VALUES
('sms',  1, 'sms-api-key-placeholder',  'SuperArt',  NULL),
('line', 0, NULL,                        NULL,        'line-token-placeholder');

-- Message Templates
INSERT IGNORE INTO message_templates (name, template_key, message_text, is_active) VALUES
('แจ้งรับซ่อม',    'repair_received',   'สวัสดีครับ/ค่ะ คุณ{customer_name} เราได้รับอุปกรณ์ {device_brand} {device_model} ของคุณเรียบร้อยแล้ว รหัสงาน: {order_code} คาดว่าจะซ่อมเสร็จวันที่ {estimated_date} - SuperArt Mobile', 1),
('ซ่อมเสร็จแล้ว',  'repair_completed',  'สวัสดีครับ/ค่ะ คุณ{customer_name} อุปกรณ์ {device_brand} {device_model} ของคุณซ่อมเสร็จแล้ว ยอดชำระ {total_amount} บาท กรุณามารับได้เลยครับ/ค่ะ - SuperArt Mobile', 1),
('แจ้งเตือนชำระ',  'payment_reminder',  'เรียนคุณ{customer_name} กรุณาชำระค่าบริการซ่อม {device_model} รหัสงาน {order_code} จำนวน {total_amount} บาท ภายในวันที่ {due_date} - SuperArt Mobile', 1);
