const mysql = require('mysql2/promise');
require('dotenv').config();

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Error: Environment variable ${varName} is missing.`);
        process.exit(1);
    }
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME,
    // TiDB Cloud Serverless บังคับเชื่อมต่อผ่าน TLS
    ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

module.exports = pool;