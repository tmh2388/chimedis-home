import mysql from 'mysql2/promise';

// Optional pattern giống chimedis-web: nếu chưa cấu hình env var MySQL, pool = null,
// các route cần DB tự trả 503 thay vì crash toàn bộ server (cho phép deploy code trước
// khi user điền Environment Variables trên Hostinger hPanel).
let pool = null;
if (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE) {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4_general_ci',
  });
}

export function isDbConfigured() {
  return !!pool;
}

export function getPool() {
  return pool;
}
