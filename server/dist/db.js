import 'dotenv/config';
import mysql from 'mysql2/promise';
const required = ['DB_HOST', 'DB_NAME', 'DB_USER'];
for (const key of required) {
    if (!process.env[key])
        throw new Error(`${key} saknas i server/.env`);
}
export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    decimalNumbers: true,
});
export async function verifyDatabase() {
    const connection = await pool.getConnection();
    try {
        await connection.query('SELECT 1');
    }
    finally {
        connection.release();
    }
}
