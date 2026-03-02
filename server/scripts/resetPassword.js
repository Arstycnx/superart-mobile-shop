const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const hash = await bcrypt.hash('admin123', 10);
        console.log('Generated hash:', hash);

        const [result] = await pool.query(
            "UPDATE users SET password = ? WHERE email = 'admin@superart.com'",
            [hash]
        );

        if (result.affectedRows === 0) {
            console.log('⚠️  No user found with email admin@superart.com — inserting one.');
            await pool.query(
                "INSERT INTO users (email, password, full_name, role) VALUES ('admin@superart.com', ?, 'ผู้ดูแลระบบ', 'admin')",
                [hash]
            );
            console.log('✅ Admin user created successfully!');
        } else {
            console.log('✅ Password reset successfully!');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
