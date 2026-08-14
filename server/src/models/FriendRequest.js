const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FriendRequest = sequelize.define('FriendRequest', {
  request_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  sender_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  receiver_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'accepted', 'declined', 'cancelled'), allowNull: false, defaultValue: 'pending' },
  sent_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'friend_requests',
  timestamps: false
});

module.exports = FriendRequest;
