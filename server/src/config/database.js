const { Sequelize } = require('sequelize');
require('dotenv').config();

// Connect to MySQL using the DATABASE_URL environment variable
const sequelize = new Sequelize(process.env.DATABASE_URL, {
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
