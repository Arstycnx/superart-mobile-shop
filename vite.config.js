import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],
        // VITE_BASE_PATH ถูกตั้งใน .env.production เป็น /66223537/ เพราะเว็บไซต์บน
        // comhost.cmru.ac.th เข้าถึงผ่าน path ย่อยของบัญชี ไม่ใช่ root domain
        base: env.VITE_BASE_PATH || '/',
        resolve: {
            dedupe: ['react', 'react-dom', 'react-router-dom'],
        },
    };
});
