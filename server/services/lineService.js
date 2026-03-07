const { messagingApi } = require('@line/bot-sdk');

const client = new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

const sendPushMessage = async (lineUserId, messages) => {
    try {
        if (!lineUserId) {
            console.log('No LINE user ID, skipping notification');
            return { success: false, message: 'No LINE user ID' };
        }
        await client.pushMessage({
            to: lineUserId,
            messages: Array.isArray(messages) ? messages : [messages]
        });
        console.log('LINE message sent to:', lineUserId);
        return { success: true };
    } catch (error) {
        console.error('LINE send error:', error.message);
        return { success: false, message: error.message };
    }
};

const sendRepairStatusUpdate = async (customer, repairOrder, newStatus) => {
    const statusMap = {
        received: 'รับเครื่องแล้ว',
        repairing: 'กำลังซ่อม',
        completed: 'ซ่อมเสร็จแล้ว รอส่งมอบ',
        delivered: 'ส่งมอบเรียบร้อย',
        cancelled: 'ยกเลิกการซ่อม'
    };

    const status = newStatus || repairOrder.status;

    const message = {
        type: 'text',
        text: `🔧 SuperArt Repair แจ้งเตือน\n\nหมายเลขซ่อม: ${repairOrder.order_code}\nอุปกรณ์: ${repairOrder.device_brand} ${repairOrder.device_model}\nสถานะ: ${statusMap[status] || status}\n\nขอบคุณที่ใช้บริการ SuperArt`
    };

    const lineUserId = customer.line_user_id;
    return await sendPushMessage(lineUserId, message);
};

const sendTestMessage = async (lineUserId) => {
    const message = {
        type: 'text',
        text: '✅ ทดสอบระบบแจ้งเตือน SuperArt Repair สำเร็จ!'
    };
    return await sendPushMessage(lineUserId, message);
};

// Legacy alias kept for backward-compat with any caller using sendMessage
const sendMessage = async (userId, messageText) => {
    return await sendPushMessage(userId, { type: 'text', text: messageText });
};

module.exports = { sendPushMessage, sendRepairStatusUpdate, sendTestMessage, sendMessage };
