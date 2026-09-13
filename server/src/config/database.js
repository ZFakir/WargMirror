const { Sequelize } = require('sequelize');
require('dotenv').config();

const cleanDbUrl = process.env.DATABASE_URL.replace('?ssl-mode=REQUIRED', '');

// Connect to MySQL using the cleaned connection string
const sequelize = new Sequelize(cleanDbUrl, {
  dialect: 'mysql',
  logging: false, // Set to true to see SQL queries in the console
  dialectOptions: {
    // Aiven requires SSL for MySQL connections
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

module.exports = sequelize;
