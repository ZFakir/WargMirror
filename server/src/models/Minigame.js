const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Minigame = sequelize.define('Minigame', {
  game_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  game_type: { type: DataTypes.ENUM('gps_proximity', 'text_answer', 'qr_barcode', 'ar_object_scan', 'colour_match', 'shape_match', 'photo_submit'), allowNull: false },
  config_json: { type: DataTypes.JSON, allowNull: true },
  points_value: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 10 }
}, {
  tableName: 'minigames',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Minigame;
