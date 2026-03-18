require('dotenv').config();
const pool = require('./config/db');

async function checkCustomer() {
  try {
    const [rows] = await pool.query("SELECT id, full_name, phone, telegram_chat_id FROM customers WHERE phone='0891112233'");
    console.log('[Customer]:', rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkCustomer();
