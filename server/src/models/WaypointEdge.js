const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WaypointEdge = sequelize.define('WaypointEdge', {
  edge_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  from_waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  to_waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  conditions_json: { type: DataTypes.JSON, allowNull: true }
}, {
  tableName: 'waypoint_edges',
  timestamps: false
});

module.exports = WaypointEdge;
