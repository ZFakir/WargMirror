const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserBadge = sequelize.define('UserBadge', {
  user_badge_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  badge_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
}, {
  tableName: 'user_badges',
  timestamps: true,
  createdAt: 'awarded_at',
  updatedAt: false
});

module.exports = UserBadge;
