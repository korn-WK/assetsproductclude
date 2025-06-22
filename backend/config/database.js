module.exports = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'assets',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00', // Set timezone to Thailand (UTC+7)
  charset: 'utf8mb4',
  dateStrings: true, // Return dates as strings to avoid timezone conversion issues
}; 