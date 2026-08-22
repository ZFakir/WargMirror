const sequelize = require('../config/database');

const User = require('./User');
const UserFollow = require('./UserFollow');
const FriendRequest = require('./FriendRequest');
const Notification = require('./Notification');
const Arg = require('./Arg');
const Waypoint = require('./Waypoint');
const WaypointEdge = require('./WaypointEdge');
const Minigame = require('./Minigame');
const Asset = require('./Asset');
const GameSession = require('./GameSession');
const WaypointProgress = require('./WaypointProgress');
const MinigameAttempt = require('./MinigameAttempt');
const LocationEvent = require('./LocationEvent');
const TrustEvent = require('./TrustEvent');
const ArgVote = require('./ArgVote');
const Badge = require('./Badge');
const UserBadge = require('./UserBadge');
const Flag = require('./Flag');
const Comment = require('./Comment');

// Define Associations

// User follows (Self-referential Many-to-Many)
User.belongsToMany(User, { as: 'Followers', through: UserFollow, foreignKey: 'followed_id', otherKey: 'follower_id' });
User.belongsToMany(User, { as: 'Following', through: UserFollow, foreignKey: 'follower_id', otherKey: 'followed_id' });

// Friend Requests
FriendRequest.belongsTo(User, { as: 'Sender', foreignKey: 'sender_id' });
FriendRequest.belongsTo(User, { as: 'Receiver', foreignKey: 'receiver_id' });

// Notifications
Notification.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Notification, { foreignKey: 'user_id' });

// Args
Arg.belongsTo(User, { as: 'Creator', foreignKey: 'creator_id' });
User.hasMany(Arg, { foreignKey: 'creator_id' });

// Waypoints
Waypoint.belongsTo(Arg, { foreignKey: 'arg_id' });
Arg.hasMany(Waypoint, { foreignKey: 'arg_id' });

// Waypoint Edges
WaypointEdge.belongsTo(Arg, { foreignKey: 'arg_id' });
Arg.hasMany(WaypointEdge, { foreignKey: 'arg_id' });
WaypointEdge.belongsTo(Waypoint, { as: 'FromWaypoint', foreignKey: 'from_waypoint_id' });
WaypointEdge.belongsTo(Waypoint, { as: 'ToWaypoint', foreignKey: 'to_waypoint_id' });

// Minigames
Minigame.belongsTo(Waypoint, { foreignKey: 'waypoint_id' });
Waypoint.hasMany(Minigame, { foreignKey: 'waypoint_id' });

// Assets
Asset.belongsTo(User, { as: 'Uploader', foreignKey: 'uploader_id' });
Asset.belongsTo(Waypoint, { foreignKey: 'waypoint_id' });
Asset.belongsTo(Arg, { foreignKey: 'arg_id' });

// Game Sessions
GameSession.belongsTo(User, { foreignKey: 'user_id' });
GameSession.belongsTo(Arg, { foreignKey: 'arg_id' });
User.hasMany(GameSession, { foreignKey: 'user_id' });
Arg.hasMany(GameSession, { foreignKey: 'arg_id' });

// Waypoint Progress
WaypointProgress.belongsTo(User, { foreignKey: 'user_id' });
WaypointProgress.belongsTo(Waypoint, { foreignKey: 'waypoint_id' });

// Minigame Attempts
MinigameAttempt.belongsTo(User, { foreignKey: 'user_id' });
MinigameAttempt.belongsTo(Minigame, { foreignKey: 'game_id' });

// Tracking Events
LocationEvent.belongsTo(User, { foreignKey: 'user_id' });
TrustEvent.belongsTo(User, { foreignKey: 'user_id' });
ArgVote.belongsTo(User, { foreignKey: 'user_id' });
ArgVote.belongsTo(Arg, { foreignKey: 'arg_id' });

// Badges (Many-to-Many with User)
User.belongsToMany(Badge, { through: UserBadge, foreignKey: 'user_id' });
Badge.belongsToMany(User, { through: UserBadge, foreignKey: 'badge_id' });
// Add relationships directly to UserBadge if you want to include it easily
UserBadge.belongsTo(User, { foreignKey: 'user_id' });
UserBadge.belongsTo(Badge, { foreignKey: 'badge_id' });
User.hasMany(UserBadge, { foreignKey: 'user_id' });
Badge.hasMany(UserBadge, { foreignKey: 'badge_id' });

// Flags
Flag.belongsTo(Arg, { foreignKey: 'arg_id' });
Flag.belongsTo(User, { as: 'Reporter', foreignKey: 'reporter_id' });
Flag.belongsTo(User, { as: 'Resolver', foreignKey: 'resolved_by' });
Arg.hasMany(Flag, { foreignKey: 'arg_id' });
User.hasMany(Flag, { foreignKey: 'reporter_id' });

// Comments
Comment.belongsTo(User, { foreignKey: 'user_id' });
Comment.belongsTo(Arg, { foreignKey: 'arg_id' });
User.hasMany(Comment, { foreignKey: 'user_id' });
Arg.hasMany(Comment, { foreignKey: 'arg_id' });

// Comment replies (self-referential)
Comment.hasMany(Comment, { as: 'replies', foreignKey: 'parent_id' });
Comment.belongsTo(Comment, { as: 'parent', foreignKey: 'parent_id' });

module.exports = {
  sequelize,
  User,
  UserFollow,
  FriendRequest,
  Notification,
  Arg,
  Waypoint,
  WaypointEdge,
  Minigame,
  Asset,
  GameSession,
  WaypointProgress,
  MinigameAttempt,
  LocationEvent,
  TrustEvent,
  ArgVote,
  Badge,
  UserBadge,
  Flag,
  Comment
};
