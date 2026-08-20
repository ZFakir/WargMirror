const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Flag = sequelize.define('Flag', {
  flag_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  reporter_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  reason: {
    type: DataTypes.ENUM(
      'inappropriate_content',
      'inaccurate_location',
      'safety_concern',
      'spam',
      'copyright',
      'other'
    ),
    allowNull: false
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('open', 'reviewing', 'resolved', 'dismissed'),
    allowNull: false,
    defaultValue: 'open'
  },
  resolved_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
  resolved_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  resolution_note: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'flags',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Flag;
