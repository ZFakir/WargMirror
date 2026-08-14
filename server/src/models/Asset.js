const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asset = sequelize.define('Asset', {
  asset_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  uploader_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  asset_type: { type: DataTypes.ENUM('image', 'audio', 'video', 'model_3d', 'ar_marker'), allowNull: false, defaultValue: 'image' },
  filename: { type: DataTypes.STRING(256), allowNull: false },
  asset_data: { type: DataTypes.BLOB('long'), allowNull: false },
  mime_type: { type: DataTypes.STRING(128), allowNull: false },
  size_bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  uploaded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'assets',
  timestamps: false
});

module.exports = Asset;
