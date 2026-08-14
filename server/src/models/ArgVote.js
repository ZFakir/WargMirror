const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArgVote = sequelize.define('ArgVote', {
  vote_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  vote: { type: DataTypes.ENUM('like', 'dislike'), allowNull: false },
  voted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'arg_votes',
  timestamps: false
});

module.exports = ArgVote;
