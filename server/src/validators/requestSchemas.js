const { z } = require('zod');

const positiveInt = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
  z.number().int().positive()
);
const optionalPositiveInt = positiveInt.optional();
const boundedString = (max) => z.string().trim().max(max);
const optionalText = (max) => boundedString(max).optional();
const requestObject = (shape) => z.object(shape);

const argIdParams = requestObject({ id: positiveInt });
const argFlagParams = requestObject({ id: positiveInt, flagId: positiveInt });
const userIdParams = requestObject({ id: positiveInt });
const friendParams = requestObject({ id: positiveInt, friendId: positiveInt });
const requestIdParams = requestObject({ requestId: positiveInt });
const sessionParams = requestObject({ user_id: positiveInt });
const sessionArgParams = requestObject({ user_id: positiveInt, arg_id: positiveInt });
const gameIdParams = requestObject({ gameId: positiveInt });
const gameParams = requestObject({ argId: positiveInt });
const waypointParams = requestObject({ argId: positiveInt, waypointId: positiveInt });

const auth = {
  signup: requestObject({
    username: boundedString(64).min(1, 'Username is required'),
    email: z.string().trim().email().max(254),
    password: z.string().min(6).max(128)
  }),
  login: requestObject({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128)
  }).passthrough(),
  account: requestObject({
    email: z.string().trim().email().max(254).optional(),
    password: z.string().min(6).max(128).optional(),
    current_password: z.string().min(1).max(128).optional()
  }).refine((data) => data.email !== undefined || data.password !== undefined, {
    message: 'Provide an email or password',
    path: []
  }).refine((data) => !data.password || data.current_password, {
    message: 'Current password is required when changing a password',
    path: ['current_password']
  }),
  forgot: requestObject({ email: z.string().trim().email().max(254) }),
  reset: requestObject({
    token: z.string().min(1).max(256),
    password: z.string().min(6).max(128)
  }),
  checkUser: requestObject({
    email: z.string().trim().email().max(254).optional(),
    username: boundedString(64).optional()
  })
};

const minigame = requestObject({
  minigame_id: optionalPositiveInt,
  type: boundedString(64).optional(),
  minigame_config: z.unknown().optional()
});

const waypoint = requestObject({
  id: z.union([z.string().min(1).max(64), z.number().int().positive()]).optional(),
  waypoint_id: optionalPositiveInt,
  title: optionalText(255),
  description: optionalText(5000),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  validation_radius_m: z.number().finite().positive().max(100000).optional(),
  type: boundedString(64).optional(),
  games: z.array(minigame).max(50).optional()
});

const edge = requestObject({
  from: z.union([z.string().min(1).max(64), z.number().int().positive()]).optional(),
  to: z.union([z.string().min(1).max(64), z.number().int().positive()]).optional(),
  from_waypoint_id: optionalPositiveInt,
  to_waypoint_id: optionalPositiveInt,
  triggers: z.array(requestObject({
    game_index: z.number().int().nonnegative(),
    outcome: z.enum(['pass', 'fail'])
  })).max(50).optional()
}).refine((data) => (data.from !== undefined && data.to !== undefined) ||
  (data.from_waypoint_id !== undefined && data.to_waypoint_id !== undefined), {
  message: 'Each edge needs a source and destination',
  path: []
});

const args = {
  content: requestObject({
    title: optionalText(255),
    description: optionalText(5000),
    status: z.enum(['unpublished', 'published', 'retired']).optional(),
    mode: z.enum(['solo', 'coop', 'pvp', 'live']).optional(),
    waypoints: z.array(waypoint).max(200).optional(),
    edges: z.array(edge).max(500).optional()
  }),
  status: requestObject({ status: z.enum(['unpublished', 'published', 'retired']) }),
  vote: requestObject({ vote: z.enum(['like', 'dislike']) }),
  flag: requestObject({
    reason: boundedString(100).min(1, 'Reason is required'),
    description: optionalText(2000)
  })
};

const users = {
  search: requestObject({ q: boundedString(100).optional() }),
  friendRequest: requestObject({ receiverId: positiveInt }),
  friendResponse: requestObject({ status: z.enum(['accepted', 'declined']) })
};

const game = {
  params: gameParams,
  waypointParams,
  submission: requestObject({
    game_id: positiveInt,
    submission: z.unknown().optional(),
    geofence_override: z.boolean().optional()
  }),
  location: requestObject({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    accuracy_m: z.number().finite().nonnegative().max(100000).optional()
  }),
  dominationPing: requestObject({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    accuracy_m: z.number().finite().nonnegative().max(100000).optional(),
    game_id: positiveInt
  }),
  dominationScores: requestObject({
    game_id: positiveInt,
    user_id: optionalPositiveInt
  })
};

const comments = {
  argParams: requestObject({ argId: positiveInt }),
  create: requestObject({
    body: boundedString(5000).min(1, 'Comment body cannot be empty'),
    parent_id: optionalPositiveInt,
    is_spoiler: z.boolean().optional()
  })
};

const feedback = requestObject({
  uiExperience: z.coerce.number().int().min(1).max(5).optional(),
  gameExperience: z.coerce.number().int().min(1).max(5).optional(),
  creatorExperience: z.coerce.number().int().min(1).max(5).optional(),
  gpsExperience: z.coerce.number().int().min(1).max(5).optional(),
  socialExperience: z.coerce.number().int().min(1).max(5).optional(),
  perfExperience: z.coerce.number().int().min(1).max(5).optional(),
  nps: z.coerce.number().int().min(0).max(10).optional(),
  featureRequest: optionalText(2000),
  feedbackText: optionalText(5000)
});

const admin = {
  id: requestObject({ id: positiveInt }),
  search: requestObject({ search: boundedString(100).optional() })
};

module.exports = {
  admin,
  argFlagParams,
  argIdParams,
  args,
  auth,
  comments,
  feedback,
  friendParams,
  game,
  gameIdParams,
  requestIdParams,
  sessionArgParams,
  sessionParams,
  userIdParams,
  users
};
