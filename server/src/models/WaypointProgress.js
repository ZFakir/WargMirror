const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WaypointProgress = sequelize.define('WaypointProgress', {
  user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  status: { type: DataTypes.ENUM('locked', 'unlocked', 'completed', 'skipped'), allowNull: false, defaultValue: 'locked' },
  unlocked_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  attempts: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  points_earned: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'waypoint_progress',
  timestamps: false
});

module.exports = WaypointProgress;
