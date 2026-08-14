const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LocationEvent = sequelize.define('LocationEvent', {
  event_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  location: { type: DataTypes.GEOMETRY('POINT', 4326), allowNull: false },
  accuracy_m: { type: DataTypes.FLOAT, allowNull: true },
  speed_ms: { type: DataTypes.FLOAT, allowNull: true },
  heading: { type: DataTypes.FLOAT, allowNull: true },
  recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  is_suspicious: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  flags_json: { type: DataTypes.JSON, allowNull: true }
}, {
  tableName: 'location_events',
  timestamps: false
});

module.exports = LocationEvent;
