import os

models_dir = r"c:\Users\Father Fakir\WARG-Platform\server\src\models"
os.makedirs(models_dir, exist_ok=True)

models = {
    "User": """const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  google_uid: { type: DataTypes.STRING(256), allowNull: false, unique: true },
  username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(256), allowNull: false, unique: true },
  avatar: { type: DataTypes.BLOB('medium'), allowNull: true },
  role: { type: DataTypes.ENUM('player', 'creator', 'admin'), allowNull: false, defaultValue: 'player' },
  session_token: { type: DataTypes.CHAR(64), allowNull: true },
  total_points: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  distance_walked_m: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  trust_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 100.00 },
  is_flagged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  is_suspended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  suspended_until: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;
""",

    "UserFollow": """const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserFollow = sequelize.define('UserFollow', {
  follower_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  followed_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true }
}, {
  tableName: 'user_follows',
  timestamps: false
});

module.exports = UserFollow;
""",

    "FriendRequest": """const { DataTypes } = require('sequelize');
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
""",

    "Notification": """const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  notification_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  type: { type: DataTypes.STRING(64), allowNull: false },
  title: { type: DataTypes.STRING(256), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: true },
  payload_json: { type: DataTypes.JSON, allowNull: true },
  is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'notifications',
  timestamps: false
});

module.exports = Notification;
""",

    "Arg": """const { DataTypes } = require('sequelize');
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
""",

    "Waypoint": """const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Waypoint = sequelize.define('Waypoint', {
  waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  title: { type: DataTypes.STRING(256), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  location: { type: DataTypes.GEOMETRY('POINT', 4326), allowNull: false },
  validation_radius_m: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 30 },
  sort_order: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'waypoints',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Waypoint;
""",

    "WaypointEdge": """const { DataTypes } = require('sequelize');
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
""",

    "Minigame": """const { DataTypes } = require('sequelize');
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
""",

    "Asset": """const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asset = sequelize.define('Asset', {
  asset_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  uploader_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  asset_type: { type: DataTypes.ENUM('image', 'audio', 'video', 'model_3d', 'ar_marker'), allowNull: false, defaultValue: 'image' },
  filename: { type: DataTypes.STRING(256), allowNull: false },
  asset_data: { type: DataTypes.BLOB('long'), allowNull: false },
  mime_type: { type: DataTypes.STRING(128), allowNull: false },
  size_bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  uploaded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'assets',
  timestamps: false
});

module.exports = Asset;
""",

    "GameSession": """const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GameSession = sequelize.define('GameSession', {
  user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  arg_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  status: { type: DataTypes.ENUM('active', 'completed', 'abandoned'), allowNull: false, defaultValue: 'active' },
  started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  last_active_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  total_points_earned: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  distance_m: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'game_sessions',
  timestamps: false
});

module.exports = GameSession;
""",

    "WaypointProgress": """const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WaypointProgress = sequelize.define('WaypointProgress', {
  user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  waypoint_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  status: { type: DataTypes.ENUM('locked', 'unlocked', 'completed', 'skipped'), allowNull: false, defaultValue: 'locked' },
  unlocked_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  attempts: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  points_earned: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'waypoint_progress',
  timestamps: false
});

module.exports = WaypointProgress;
""",

    "MinigameAttempt": """const { DataTypes } = require('sequelize');
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
""",

    "LocationEvent": """const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LocationEvent = sequelize.define('LocationEvent', {
  event_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  location: { type: DataTypes.GEOMETRY('POINT', 4326), allowNull: false },
  accuracy_m: { type: DataTypes.FLOAT, allowNull: true },
  speed_ms: { type: DataTypes.FLOAT, allowNull: true },
  heading: { type: DataTypes.FLOAT, allowNull: true },
  recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  is_suspicious: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  flags_json: { type: DataTypes.JSON, allowNull: true }
}, {
  tableName: 'location_events',
  timestamps: false
});

module.exports = LocationEvent;
""",

    "TrustEvent": """const { DataTypes } = require('sequelize');
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
""",

    "ArgVote": """const { DataTypes } = require('sequelize');
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
"""
}

index_js = """const sequelize = require('../config/database');

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
  ArgVote
};
"""

for model_name, content in models.items():
    with open(os.path.join(models_dir, f"{model_name}.js"), "w", encoding="utf-8") as f:
        f.write(content)

with open(os.path.join(models_dir, "index.js"), "w", encoding="utf-8") as f:
    f.write(index_js)

print("Models generated successfully!")
