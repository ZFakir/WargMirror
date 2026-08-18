const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Badge = sequelize.define('Badge', {
  badge_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  icon_svg: { type: DataTypes.TEXT, allowNull: true },
  award_criteria: { type: DataTypes.JSON, allowNull: false }
}, {
  tableName: 'badges',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Badge;
