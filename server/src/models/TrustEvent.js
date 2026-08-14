const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TrustEvent = sequelize.define('TrustEvent', {
  event_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  event_type: { type: DataTypes.STRING(64), allowNull: false },
  delta_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  context_json: { type: DataTypes.JSON, allowNull: true },
  recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'trust_events',
  timestamps: false
});

module.exports = TrustEvent;
