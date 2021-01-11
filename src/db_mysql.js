// load libraires
const mysql = require('mysql2/promise');

// environment configuration
require('dotenv').config();

// create mysql connection pool
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'simplenotes',
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT) || 4,
    timezone: '+08:00'
});

const mkQuery = (sql, pool) => {
    return (async(args) => {
        const conn = await pool.getConnection();

        try {
            const [ result, _ ] = await conn.query(sql, args || []);
            return result;
        } catch(error) {
            console.error(`[ERROR] Failed to execute sql query.`);
            console.error(`[ERROR] Message: `, error);
            throw error;
        } finally {
            conn.release();
        }
    });
}

// sql statements
const SQL_GET_USER = 'SELECT email FROM user WHERE email = ? AND password = sha1(?)';
const SQL_INSERT_USER = 'INSERT INTO user (email, password) VALUES (?, sha1(?))';

// sql functions
const getUser = mkQuery(SQL_GET_USER, pool);
const createUser = mkQuery(SQL_INSERT_USER, pool);

// pinging mysql database
const ping = (pool) => {
    return async() => {
        const conn = await pool.getConnection();
    
        console.info(`[INFO] Ping MYSQL...`);
        await conn.ping();
        
        console.info(`[INFO] Successfully ping MYSQL.`);
        conn.release();
        
        return true;
    }
};

const pingMysql = ping(pool);


module.exports = { pingMysql, getUser, createUser };