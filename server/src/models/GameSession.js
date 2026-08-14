const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GameSession = sequelize.define('GameSession', {
  user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  status: { type: DataTypes.ENUM('active', 'completed', 'abandoned'), allowNull: false, defaultValue: 'active' },
  started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  last_active_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  total_points_earned: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  distance_m: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'game_sessions',
  timestamps: false
});

module.exports = GameSession;
