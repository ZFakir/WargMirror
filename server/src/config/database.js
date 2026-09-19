const { Sequelize } = require('sequelize');
require('dotenv').config();

const cleanDbUrl = process.env.DATABASE_URL.replace('?ssl-mode=REQUIRED', '');

const dialectOptions = process.env.NODE_ENV === 'test' 
  ? {} 
  : { ssl: { require: true, rejectUnauthorized: false } };

// Connect to MySQL using the cleaned connection string
const sequelize = new Sequelize(cleanDbUrl, {
  dialect: 'mysql',
  logging: false, // Set to true to see SQL queries in the console
  dialectOptions,
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000
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
