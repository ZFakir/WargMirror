const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  google_uid: { type: DataTypes.STRING(256), allowNull: false, unique: true },
  username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(256), allowNull: false, unique: true },
  avatar: { type: DataTypes.BLOB('medium'), allowNull: true },
  role: { type: DataTypes.ENUM('player', 'creator', 'admin'), allowNull: false, defaultValue: 'player' },
  session_token: { type: DataTypes.CHAR(64), allowNull: true },
  total_points: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  distance_walked_m: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  trust_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 100.00 },
  is_flagged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  is_suspended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  suspended_until: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;
