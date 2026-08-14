const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Waypoint = sequelize.define('Waypoint', {
  waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  title: { type: DataTypes.STRING(256), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  location: { type: DataTypes.GEOMETRY('POINT', 4326), allowNull: false },
  validation_radius_m: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 30 },
  sort_order: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'waypoints',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Waypoint;
