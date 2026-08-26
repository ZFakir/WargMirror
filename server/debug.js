console.log('1. Loading express');
const express = require('express');
console.log('2. Loading MySQLStore');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
console.log('3. Loading dotenv');
require('dotenv').config();

console.log('4. Creating DB URL');
const dbUrl = new URL(process.env.DATABASE_URL);
console.log('5. Creating sessionStore');
const sessionStoreOptions = new MySQLStore({
  host: dbUrl.hostname,
  port: dbUrl.port || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1), 
  ssl: { rejectUnauthorized: false },
  createDatabaseTable: true,
  expiration: 86400000 
});

console.log('6. Loading database config');
const sequelize = require('./src/config/database');
console.log('7. Loading passport');
const passport = require('./src/config/passport');
console.log('8. Loading models index');
const { sequelize: db } = require('./src/models');
console.log('9. Loading argRoutes');
const argRoutes = require('./src/routes/argRoutes');
console.log('10. Loading userRoutes');
const userRoutes = require('./src/routes/userRoutes');
console.log('11. Loading sessionRoutes');
const sessionRoutes = require('./src/routes/sessionRoutes');
console.log('12. Loading authRoutes');
const authRoutes = require('./src/routes/authRoutes');

console.log('All modules loaded!');
process.exit(0);
