const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    console.log("Connecting with Env -> DB_HOST:", process.env.DB_HOST, "DB_USER:", process.env.DB_USER, "DB_NAME:", process.env.DB_NAME);
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- Starting Database Migration ---');

        // 1. Add phone columns to customers
        try {
            await pool.query(`
                ALTER TABLE customers
                ADD COLUMN phone2 VARCHAR(20) DEFAULT NULL AFTER phone,
                ADD COLUMN phone3 VARCHAR(20) DEFAULT NULL AFTER phone2,
                ADD COLUMN phone4 VARCHAR(20) DEFAULT NULL AFTER phone3,
                ADD COLUMN phone5 VARCHAR(20) DEFAULT NULL AFTER phone4;
            `);
            console.log('✅ Added phone2 to phone5 columns in customers table.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('⚡ Phone columns already exist.');
            } else {
                throw e;
            }
        }

        // 2. Create claims table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS claims (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                claim_code VARCHAR(30) NOT NULL UNIQUE,
                customer_id INT UNSIGNED NOT NULL,
                repair_order_id INT UNSIGNED DEFAULT NULL,
                device_brand VARCHAR(100) DEFAULT NULL,
                device_model VARCHAR(100) DEFAULT NULL,
                claim_reason TEXT NOT NULL,
                status ENUM('pending','processing','completed','rejected') NOT NULL DEFAULT 'pending',
                resolution_notes TEXT DEFAULT NULL,
                claim_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_claim_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Claims table ensured.');

        // 3. Create shop_settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS shop_settings (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                shop_name VARCHAR(255) NOT NULL DEFAULT 'SuperArt Mobile',
                shop_address TEXT DEFAULT NULL,
                tax_id VARCHAR(50) DEFAULT NULL,
                phone VARCHAR(50) DEFAULT NULL,
                logo_url VARCHAR(500) DEFAULT NULL,
                receipt_footer_text TEXT DEFAULT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Shop Settings table ensured.');

        // Seed basic shop_settings if empty
        await pool.query(`
            INSERT IGNORE INTO shop_settings (id, shop_name, shop_address, tax_id, phone, receipt_footer_text)
            VALUES (1, 'SuperArt Mobile Repair', '123 Repair Street, Tech City', '1234567890123', '080-123-4567', 'ขอบคุณที่ใช้บริการค่ะ สินค้ารับประกัน 30 วัน')
        `);
        console.log('✅ Shop Settings seeded.');

        console.log('--- Migration Complete ---');
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
