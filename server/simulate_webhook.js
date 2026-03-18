require('dotenv').config();
const pool = require('./config/db');
const { registerWebhook } = require('./services/telegramService');

async function simulateWebhook() {
  try {
    // ดึง Token จากฐานข้อมูล หรือ .env
    const [[row]] = await pool.query("SELECT access_token FROM notification_settings WHERE channel = 'telegram' LIMIT 1");
    const token = (row && row.access_token) ? row.access_token : process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.log('❌ ไม่พบ Telegram Bot Token ในระบบ (ในตาราง notification_settings หรือในไฟล์ .env)');
      console.log('💡 คุณต้องใส่ Bot Token ในหน้า "ตั้งค่าการแจ้งเตือน" และกดบันทึกก่อนครับ');
      process.exit(1);
    }

    // URL จำลองแบบมี HTTPS (ใช้ example.com เพื่อให้ Telegram ผ่านการเช็ค DNS)
    const dummyDomain = 'https://example.com';
    const testUrl = `${dummyDomain}/api/telegram/webhook`;

    console.log('=============================================');
    console.log(`🚀 กำลังจำลองส่งคำสั่ง setWebhook ไปที่ Telegram API...`);
    console.log(`🔗 URL ที่ใช้ผูก: ${testUrl}`);
    console.log(`🔑 Token ที่พบ: ${token.substring(0, 10)}... (ซ่อนไว้เพื่อความปลอดภัย)`);
    console.log('=============================================');

    const result = await registerWebhook(testUrl, token);

    console.log();
    console.log('📦 ผลลัพธ์ที่ได้จากการตอบกลับของ Telegram:');
    console.dir(result, { depth: null, colors: true });
    console.log('=============================================');

    if (result.success) {
      console.log('✅ จำลองการทำงานสำเร็จ! Telegram ยอมรับ URL นี้ครับ');
    } else {
      console.log('❌ จำลองการทำงานล้มเหลว ดู Error message ด้านบนครับ');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาดของระบบ:', err);
    process.exit(1);
  }
}

simulateWebhook();
