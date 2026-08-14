const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserFollow = sequelize.define('UserFollow', {
  follower_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  followed_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true }
}, {
  tableName: 'user_follows',
  timestamps: false
});

module.exports = UserFollow;
