-- =====================================================
-- SuperArt Mobile Repair Shop Management System
-- Database Schema - Fresh Install
-- Created: 2026-03-07
-- =====================================================

CREATE DATABASE IF NOT EXISTS superart_repair
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE superart_repair;

-- =====================================================
-- TABLE 1: users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          ENUM('admin','technician','staff') NOT NULL DEFAULT 'staff',
  avatar_url    VARCHAR(500) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 2: customers
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_code    VARCHAR(20)  NOT NULL UNIQUE,
  full_name        VARCHAR(150) NOT NULL,
  phone            VARCHAR(20)  DEFAULT NULL,
  phone2           VARCHAR(20)  DEFAULT NULL,
  phone3           VARCHAR(20)  DEFAULT NULL,
  phone4           VARCHAR(20)  DEFAULT NULL,
  phone5           VARCHAR(20)  DEFAULT NULL,
  line_id          VARCHAR(100) DEFAULT NULL,
  telegram_chat_id VARCHAR(100) DEFAULT NULL,   -- Telegram Bot chat ID
  email            VARCHAR(255) DEFAULT NULL,
  member_level     ENUM('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
  total_spent      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  visit_count      INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 3: products
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_code        VARCHAR(30)  NOT NULL UNIQUE,
  name                VARCHAR(200) NOT NULL,
  description         TEXT         DEFAULT NULL,
  category            ENUM('screen','battery','accessories','cable','case','other') NOT NULL DEFAULT 'other',
  cost_price          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sell_price          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantity            INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  image_url           VARCHAR(500) DEFAULT NULL,
  status              ENUM('in_stock','low_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 4: repair_orders
-- =====================================================
CREATE TABLE IF NOT EXISTS repair_orders (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code            VARCHAR(30)  NOT NULL UNIQUE,
  customer_id           INT UNSIGNED NOT NULL,
  device_type           VARCHAR(50)  DEFAULT NULL,
  device_brand          VARCHAR(100) DEFAULT NULL,
  device_model          VARCHAR(100) DEFAULT NULL,
  device_color          VARCHAR(50)  DEFAULT NULL,
  device_imei           VARCHAR(20)  DEFAULT NULL,
  symptoms              TEXT         DEFAULT NULL,
  symptom_tags          JSON         DEFAULT NULL,
  technician_notes      TEXT         DEFAULT NULL,
  urgency               ENUM('normal','urgent','express') NOT NULL DEFAULT 'normal',
  status                ENUM('received','repairing','completed','delivered','cancelled') NOT NULL DEFAULT 'received',
  estimated_cost        DECIMAL(10,2) DEFAULT NULL,
  final_cost            DECIMAL(10,2) DEFAULT NULL,
  service_charge        DECIMAL(10,2) DEFAULT 0.00,
  before_photo          VARCHAR(500) DEFAULT NULL,
  after_photo           VARCHAR(500) DEFAULT NULL,
  appointment_date      DATETIME     DEFAULT NULL,
  estimated_completion  DATE         DEFAULT NULL,
  received_date         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_date        DATETIME     DEFAULT NULL,
  delivered_date        DATETIME     DEFAULT NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ro_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 5: repair_parts
-- =====================================================
CREATE TABLE IF NOT EXISTS repair_parts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id  INT UNSIGNED NOT NULL,
  product_id       INT UNSIGNED NOT NULL,
  quantity         INT          NOT NULL DEFAULT 1,
  unit_price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_rp_order   FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rp_product FOREIGN KEY (product_id)      REFERENCES products(id)      ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 6: repair_timeline
-- =====================================================
CREATE TABLE IF NOT EXISTS repair_timeline (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id  INT UNSIGNED NOT NULL,
  status           VARCHAR(50)  NOT NULL,
  description      TEXT         DEFAULT NULL,
  updated_by       VARCHAR(150) DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 7: payments
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_code     VARCHAR(30)  NOT NULL UNIQUE,
  repair_order_id  INT UNSIGNED NOT NULL,
  customer_id      INT UNSIGNED NOT NULL,
  amount           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_type     ENUM('full','partial','deposit') NOT NULL DEFAULT 'full',
  payment_method   ENUM('cash','transfer','qr','credit_card') NOT NULL DEFAULT 'cash',
  payment_slip_url VARCHAR(500)  DEFAULT NULL,
  status           ENUM('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
  verified_by      VARCHAR(150) DEFAULT NULL,
  verified_at      DATETIME     DEFAULT NULL,
  payment_date     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_order    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON UPDATE CASCADE,
  CONSTRAINT fk_pay_customer FOREIGN KEY (customer_id)     REFERENCES customers(id)     ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 8: notification_settings
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  channel      ENUM('sms','telegram') NOT NULL UNIQUE,
  is_enabled   TINYINT(1) NOT NULL DEFAULT 0,
  api_key      VARCHAR(500) DEFAULT NULL,
  sender_name  VARCHAR(100) DEFAULT NULL,
  access_token VARCHAR(500) DEFAULT NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 9: message_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  template_key  VARCHAR(100) NOT NULL UNIQUE,
  message_text  TEXT         NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- SEED DATA
-- (INSERT IGNORE so re-running is safe)
-- =====================================================

-- ----------------------------------------------------
-- 1. Admin user  (password: admin123)
-- ----------------------------------------------------
INSERT IGNORE INTO users (id, email, password, full_name, role) VALUES
(1, 'admin@superart.com', '$2b$10$W3H7g1Pw3uprQdtcXleomuWRTwpkb.CFlNvkNNHEJMKzgn35Qy7gW', 'ผู้ดูแลระบบ', 'admin');

-- ----------------------------------------------------
-- 2. Customers (5 records)
-- ----------------------------------------------------
INSERT IGNORE INTO customers (id, customer_code, full_name, phone, line_id, member_level, total_spent, visit_count) VALUES
(1, 'CUS-0001', 'สมชาย ใจดี',      '0812345678', 'somchai_line',  'silver',   4500.00, 3),
(2, 'CUS-0002', 'นิดา วงศ์จันทร์',  '0823456789', 'nida_line',     'bronze',   1200.00, 1),
(3, 'CUS-0003', 'อนุชา พรหมดี',     '0834567890', 'anucha_line',   'gold',     9800.00, 6),
(4, 'CUS-0004', 'วิภา เจริญสุข',    '0845678901', NULL,            'bronze',    800.00, 1),
(5, 'CUS-0005', 'กิตติ์ รัตนากร',  '0856789012', 'kitti_line',    'platinum', 25000.00, 12);

-- ----------------------------------------------------
-- 3. Products (6 records)
-- ----------------------------------------------------
INSERT IGNORE INTO products (id, product_code, name, category, cost_price, sell_price, quantity, low_stock_threshold, status) VALUES
(1, 'PRD-0001', 'จอ iPhone 13',            'screen',    1800.00, 2800.00, 8,  3, 'in_stock'),
(2, 'PRD-0002', 'แบตเตอรี่ Samsung A54',   'battery',    350.00,  650.00, 15, 5, 'in_stock'),
(3, 'PRD-0003', 'จอ Samsung S23',           'screen',    2200.00, 3500.00, 4,  3, 'in_stock'),
(4, 'PRD-0004', 'แบตเตอรี่ iPhone 14',     'battery',    450.00,  750.00, 2,  5, 'low_stock'),
(5, 'PRD-0005', 'สายชาร์จ USB-C',          'cable',       80.00,  199.00, 30, 10, 'in_stock'),
(6, 'PRD-0006', 'เคสใส Xiaomi',            'case',        45.00,  120.00, 0,  5, 'out_of_stock');

-- ----------------------------------------------------
-- 4. Repair orders (SA-2025-0001 to 0005)
-- ----------------------------------------------------
INSERT IGNORE INTO repair_orders
  (id, order_code, customer_id, device_type, device_brand, device_model, symptoms, urgency, status, estimated_cost, final_cost, service_charge, received_date, completed_date, delivered_date, estimated_completion)
VALUES
(1, 'SA-2025-0001', 1, 'smartphone', 'Apple',   'iPhone 13',     'จอแตก แสดงผลไม่ขึ้น',      'normal',  'delivered',  2800.00, 2800.00, 200.00, '2025-01-05 09:00:00', '2025-01-07 15:00:00', '2025-01-08 11:00:00', '2025-01-08'),
(2, 'SA-2025-0002', 2, 'smartphone', 'Samsung', 'Galaxy A54',    'แบตหมดเร็ว ชาร์จไม่เข้า',  'normal',  'completed',   650.00,  650.00, 100.00, '2025-01-10 10:30:00', '2025-01-11 14:00:00', NULL,                  '2025-01-12'),
(3, 'SA-2025-0003', 3, 'smartphone', 'Samsung', 'Galaxy S23',    'จอเป็นเส้น สัมผัสไม่ติด',  'urgent',  'repairing',  3500.00,    NULL, 200.00, '2025-01-12 08:00:00', NULL,                  NULL,                  '2025-01-14'),
(4, 'SA-2025-0004', 4, 'smartphone', 'Xiaomi',  'Redmi Note 12', 'ลำโพงไม่มีเสียง',           'normal',  'received',    500.00,    NULL, 100.00, '2025-01-14 13:00:00', NULL,                  NULL,                  '2025-01-16'),
(5, 'SA-2025-0005', 5, 'smartphone', 'Apple',   'iPhone 14',     'แบตบวม เปิดไม่ติด',         'express', 'repairing',   750.00,    NULL, 150.00, '2025-01-15 09:30:00', NULL,                  NULL,                  '2025-01-16');

-- ----------------------------------------------------
-- 5. Repair timeline (10 entries)
-- ----------------------------------------------------
INSERT IGNORE INTO repair_timeline (id, repair_order_id, status, description, updated_by, created_at) VALUES
(1,  1, 'received',   'รับเครื่องเข้าระบบแล้ว',              'admin@superart.com', '2025-01-05 09:05:00'),
(2,  1, 'repairing',  'ช่างเริ่มตรวจสอบและเปลี่ยนจอ',       'admin@superart.com', '2025-01-06 10:00:00'),
(3,  1, 'completed',  'ซ่อมเสร็จแล้ว เปลี่ยนจอใหม่เรียบร้อย','admin@superart.com', '2025-01-07 15:00:00'),
(4,  1, 'delivered',  'ส่งมอบเครื่องให้ลูกค้าแล้ว',          'admin@superart.com', '2025-01-08 11:00:00'),
(5,  2, 'received',   'รับเครื่องเข้าระบบแล้ว',              'admin@superart.com', '2025-01-10 10:35:00'),
(6,  2, 'repairing',  'เปลี่ยนแบตเตอรี่ใหม่',                'admin@superart.com', '2025-01-11 09:00:00'),
(7,  2, 'completed',  'ซ่อมเสร็จแล้ว รอลูกค้ามารับ',         'admin@superart.com', '2025-01-11 14:00:00'),
(8,  3, 'received',   'รับเครื่องเข้าระบบแล้ว (งานด่วน)',    'admin@superart.com', '2025-01-12 08:05:00'),
(9,  3, 'repairing',  'กำลังวินิจฉัยปัญหาจอแสดงผล',         'admin@superart.com', '2025-01-13 09:00:00'),
(10, 4, 'received',   'รับเครื่องเข้าระบบแล้ว',              'admin@superart.com', '2025-01-14 13:05:00');

-- ----------------------------------------------------
-- 6. Repair parts (2 records)
-- ----------------------------------------------------
INSERT IGNORE INTO repair_parts (id, repair_order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 1, 1, 2800.00, 2800.00),   -- จอ iPhone 13 สำหรับ order 1
(2, 2, 2, 1,  650.00,  650.00);   -- แบตเตอรี่ Samsung A54 สำหรับ order 2

-- ----------------------------------------------------
-- 7. Payments (4 records)
-- ----------------------------------------------------
INSERT IGNORE INTO payments
  (id, receipt_code, repair_order_id, customer_id, amount, discount, total_amount, payment_type, payment_method, status, verified_by, verified_at, payment_date)
VALUES
(1, 'RCP-2025-0001', 1, 1, 3000.00, 0.00,   3000.00, 'full',    'cash',     'paid', 'admin@superart.com', '2025-01-08 11:15:00', '2025-01-08 11:10:00'),
(2, 'RCP-2025-0002', 2, 2,  750.00, 0.00,    750.00, 'full',    'transfer', 'paid', 'admin@superart.com', '2025-01-11 14:30:00', '2025-01-11 14:25:00'),
(3, 'RCP-2025-0003', 3, 3, 1000.00, 0.00,   1000.00, 'deposit', 'qr',       'paid', 'admin@superart.com', '2025-01-12 08:30:00', '2025-01-12 08:20:00'),
(4, 'RCP-2025-0004', 5, 5,  375.00, 0.00,    375.00, 'deposit', 'cash',     'paid', 'admin@superart.com', '2025-01-15 09:45:00', '2025-01-15 09:40:00');

-- ----------------------------------------------------
-- 8. Notification settings (sms enabled, telegram disabled)
-- ----------------------------------------------------
INSERT IGNORE INTO notification_settings (id, channel, is_enabled, api_key, sender_name, access_token) VALUES
(1, 'sms',      1, 'SMS_API_KEY_PLACEHOLDER',  'SuperArt', NULL),
(2, 'telegram', 0, NULL,                        NULL,       'TELEGRAM_BOT_TOKEN_PLACEHOLDER');

-- ----------------------------------------------------
-- 9. Message templates (3 records)
-- ----------------------------------------------------
INSERT IGNORE INTO message_templates (id, name, template_key, message_text, is_active) VALUES
(1, 'แจ้งรับซ่อม',     'repair_received',
   'สวัสดีค่ะ {{customer_name}}\nทางร้าน SuperArt รับเครื่องของคุณแล้ว\nรหัสงาน: {{order_code}}\nอุปกรณ์: {{device_brand}} {{device_model}}\nประเมินราคา: {{estimated_cost}} บาท\nขอบคุณที่ใช้บริการค่ะ 🙏',
   1),
(2, 'ซ่อมเสร็จแล้ว',   'repair_completed',
   'สวัสดีค่ะ {{customer_name}}\nเครื่องของคุณซ่อมเสร็จแล้วค่ะ 🎉\nรหัสงาน: {{order_code}}\nยอดชำระ: {{final_cost}} บาท\nกรุณามารับเครื่องได้ที่ร้าน SuperArt\nขอบคุณที่ใช้บริการค่ะ 🙏',
   1),
(3, 'แจ้งเตือนชำระ',   'payment_reminder',
   'สวัสดีค่ะ {{customer_name}}\nเตือนการชำระเงินค่ะ 💳\nรหัสงาน: {{order_code}}\nยอดค้างชำระ: {{outstanding_amount}} บาท\nกรุณาชำระภายใน {{due_date}}\nขอบคุณค่ะ 🙏',
   1);

-- =====================================================
-- END OF SCHEMA
-- =====================================================
