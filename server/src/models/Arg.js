const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Arg = sequelize.define('Arg', {
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  creator_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  title: { type: DataTypes.STRING(256), allowNull: false },
  caption: { type: DataTypes.TEXT, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  cover_image: { type: DataTypes.BLOB('medium'), allowNull: true },
  mode: { type: DataTypes.ENUM('solo', 'coop', 'pvp', 'live'), allowNull: false, defaultValue: 'solo' },
  genre: { type: DataTypes.STRING(64), allowNull: true },
  status: { type: DataTypes.ENUM('unpublished', 'published', 'retired'), allowNull: false, defaultValue: 'unpublished' },
  scheduled_at: { type: DataTypes.DATE, allowNull: true },
  published_at: { type: DataTypes.DATE, allowNull: true },
  retired_at: { type: DataTypes.DATE, allowNull: true },
  play_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  completion_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  like_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  dislike_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  rating_sum: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  rating_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'args',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Arg;
