const pool = require('./config/db');

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE repair_orders');
        console.log('--- repair_orders table columns ---');
        rows.forEach(row => {
            console.log(`${row.Field}: ${row.Type}`);
        });
        const hasColumn = rows.some(r => r.Field === 'appointment_date');
        if (!hasColumn) {
            console.log('\nColumn "appointment_date" is MISSING. Attempting to add...');
            await pool.query('ALTER TABLE repair_orders ADD COLUMN appointment_date DATETIME DEFAULT NULL AFTER after_photo');
            console.log('Column added successfully.');
        } else {
            console.log('\nColumn "appointment_date" already EXISTS.');
        }
    } catch (err) {
        console.error('Error checking/updating schema:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
