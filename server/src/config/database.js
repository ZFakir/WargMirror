const { Sequelize } = require('sequelize');
require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';
const rawDbUrl = process.env.DATABASE_URL || (isTest ? 'mysql://test:test@localhost:3306/warg_test' : '');
const cleanDbUrl = rawDbUrl.replace('?ssl-mode=REQUIRED', '');

const dialectOptions = isTest
  ? {}
  : {
      ssl: { require: true, rejectUnauthorized: false },
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 20000
    };

// Connect to MySQL using the cleaned connection string
const sequelize = new Sequelize(cleanDbUrl, {
  dialect: 'mysql',
  logging: false, // Set to true to see SQL queries in the console
  dialectOptions,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 5,
    min: isTest ? 0 : 1,
    acquire: 30000,
    idle: 30000,
    evict: 10000
  },
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
      /ECONNRESET/,
      /PROTOCOL_CONNECTION_LOST/
    ]
  }
});

module.exports = sequelize;
