const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Key-value platform configuration managed by admins (e.g. demo_arg_id).
 */
const PlatformSetting = sequelize.define('PlatformSetting', {
  setting_key: { type: DataTypes.STRING(64), primaryKey: true, allowNull: false },
  setting_value: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'platform_settings',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = PlatformSetting;
