const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MinigameAttempt = sequelize.define('MinigameAttempt', {
  user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  game_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  outcome: { type: DataTypes.ENUM('pass', 'fail', 'timeout'), allowNull: false },
  submission_json: { type: DataTypes.JSON, allowNull: true },
  score: { type: DataTypes.DECIMAL(5, 4), allowNull: true },
  points_awarded: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  attempted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'minigame_attempts',
  timestamps: false
});

module.exports = MinigameAttempt;
