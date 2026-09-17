const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserFeedback = sequelize.define('UserFeedback', {
  feedback_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
  ui_experience: { type: DataTypes.INTEGER, allowNull: true },
  game_experience: { type: DataTypes.INTEGER, allowNull: true },
  creator_experience: { type: DataTypes.INTEGER, allowNull: true },
  gps_experience: { type: DataTypes.INTEGER, allowNull: true },
  social_experience: { type: DataTypes.INTEGER, allowNull: true },
  perf_experience: { type: DataTypes.INTEGER, allowNull: true },
  nps: { type: DataTypes.INTEGER, allowNull: true },
  feature_request: { type: DataTypes.STRING, allowNull: true },
  feedback_text: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'user_feedback',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = UserFeedback;
