// Migration: add password-reset columns to the users table (run once on an
// existing database; fresh databases already get them from database/schema.sql).
const sequelize = require('./src/config/database');
sequelize.query("ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(64) NULL DEFAULT NULL, ADD COLUMN password_reset_expires DATETIME NULL DEFAULT NULL;")
  .then(() => { console.log('Successfully added password reset columns to users'); process.exit(0); })
  .catch(err => { console.error('Error altering table', err); process.exit(1); });
