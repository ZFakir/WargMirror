const {
  Badge,
  UserBadge,
  User,
  FriendRequest,
  GameSession,
  Waypoint,
  WaypointProgress,
  Minigame,
  MinigameAttempt,
  Arg,
  UserFeedback,
  Flag,
  Notification
} = require('../models');
const { Op } = require('sequelize');

/**
 * Safely parse JSON criteria if needed.
 */
function parseCriteria(criteria) {
  if (!criteria) return null;
  if (typeof criteria === 'object') return criteria;
  try {
    return JSON.parse(criteria);
  } catch (err) {
    return null;
  }
}

/**
 * Check whether a user was the first to complete any ARG.
 */
async function checkFirstToComplete(userId) {
  try {
    const completedSessions = await GameSession.findAll({
      where: { user_id: userId, status: 'completed' }
    });
    if (!completedSessions || completedSessions.length === 0) return false;

    for (const session of completedSessions) {
      const earliest = await GameSession.findOne({
        where: { arg_id: session.arg_id, status: 'completed' },
        order: [
          ['completed_at', 'ASC'],
          ['started_at', 'ASC'],
          ['user_id', 'ASC']
        ]
      });

      if (earliest && earliest.user_id === userId) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn('Error in checkFirstToComplete:', err.message);
    return false;
  }
}

/**
 * Check whether a user completed a game with zero failed waypoints or minigame attempts.
 */
async function checkGameCompletedNoFailures(userId) {
  try {
    const completedSessions = await GameSession.findAll({
      where: { user_id: userId, status: 'completed' }
    });
    if (!completedSessions || completedSessions.length === 0) return false;

    for (const session of completedSessions) {
      const waypoints = await Waypoint.findAll({
        where: { arg_id: session.arg_id },
        attributes: ['waypoint_id']
      });
      const wpIds = waypoints.map(w => w.waypoint_id);
      if (wpIds.length === 0) continue;

      const failedProgress = await WaypointProgress.findOne({
        where: {
          user_id: userId,
          waypoint_id: { [Op.in]: wpIds },
          status: 'failed'
        }
      });
      if (failedProgress) continue;

      let hasFailedAttempt = false;
      if (Minigame && typeof Minigame.findAll === 'function' && MinigameAttempt && typeof MinigameAttempt.findOne === 'function') {
        const minigames = await Minigame.findAll({
          where: { waypoint_id: { [Op.in]: wpIds } },
          attributes: ['game_id']
        });
        const gameIds = minigames.map(g => g.game_id);
        if (gameIds.length > 0) {
          const failedAttempt = await MinigameAttempt.findOne({
            where: {
              user_id: userId,
              game_id: { [Op.in]: gameIds },
              outcome: 'fail'
            }
          });
          if (failedAttempt) hasFailedAttempt = true;
        }
      }

      if (!hasFailedAttempt) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn('Error in checkGameCompletedNoFailures:', err.message);
    return false;
  }
}

/**
 * Check if the user failed a game on their very first attempt.
 */
async function checkGameFailedFirstAttempt(userId) {
  try {
    if (MinigameAttempt && typeof MinigameAttempt.findOne === 'function') {
      const firstAttempt = await MinigameAttempt.findOne({
        where: { user_id: userId },
        order: [['attempted_at', 'ASC']]
      });
      if (firstAttempt) {
        return firstAttempt.outcome === 'fail';
      }
    }

    if (WaypointProgress && typeof WaypointProgress.findOne === 'function') {
      const firstWp = await WaypointProgress.findOne({
        where: {
          user_id: userId,
          status: { [Op.in]: ['completed', 'failed'] }
        },
        order: [['completed_at', 'ASC']]
      });
      if (firstWp) {
        return firstWp.status === 'failed';
      }
    }

    return false;
  } catch (err) {
    console.warn('Error in checkGameFailedFirstAttempt:', err.message);
    return false;
  }
}

/**
 * Gather aggregated metrics for a user, only querying what is needed.
 */
async function aggregateUserMetrics(userId, neededTypes) {
  const metrics = {};

  const user = await User.findByPk(userId);
  if (!user) return null;

  metrics.user = user;
  metrics.distanceWalkedM = user.distance_walked_m || 0;
  metrics.trustScore = user.trust_score !== null && user.trust_score !== undefined
    ? Number(user.trust_score)
    : 100;

  if (neededTypes.has('distance_travelled')) {
    try {
      if (GameSession && typeof GameSession.sum === 'function') {
        const sessionDistanceSum = await GameSession.sum('distance_m', { where: { user_id: userId } });
        metrics.distanceWalkedM = Math.max(metrics.distanceWalkedM, sessionDistanceSum || 0);
      }
    } catch (err) {
      // Non-fatal fallback
    }
  }

  if (neededTypes.has('friends_count')) {
    try {
      metrics.friendsCount = await FriendRequest.count({
        where: {
          [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
          status: 'accepted'
        }
      });
    } catch (err) {
      metrics.friendsCount = 0;
    }
  }

  if (neededTypes.has('games_completed')) {
    try {
      metrics.gamesCompleted = await GameSession.count({
        where: { user_id: userId, status: 'completed' },
        distinct: true,
        col: 'arg_id'
      });
    } catch (err) {
      metrics.gamesCompleted = 0;
    }
  }

  if (neededTypes.has('games_created')) {
    try {
      metrics.gamesCreated = await Arg.count({
        where: { creator_id: userId }
      });
    } catch (err) {
      metrics.gamesCreated = 0;
    }
  }

  if (neededTypes.has('feedback_submitted')) {
    try {
      metrics.feedbackSubmitted = await UserFeedback.count({
        where: { user_id: userId }
      });
    } catch (err) {
      metrics.feedbackSubmitted = 0;
    }
  }

  if (neededTypes.has('report_upheld')) {
    try {
      metrics.reportsUpheld = await Flag.count({
        where: { reporter_id: userId, status: 'resolved' }
      });
    } catch (err) {
      metrics.reportsUpheld = 0;
    }
  }

  if (neededTypes.has('first_to_complete_game')) {
    metrics.firstToCompleteGame = await checkFirstToComplete(userId);
  }

  if (neededTypes.has('game_completed_no_failures')) {
    metrics.gameCompletedNoFailures = await checkGameCompletedNoFailures(userId);
  }

  if (neededTypes.has('game_failed_first_attempt')) {
    metrics.gameFailedFirstAttempt = await checkGameFailedFirstAttempt(userId);
  }

  return metrics;
}

/**
 * Evaluate if a single badge's criteria are satisfied by the user metrics.
 */
function evaluateCriteria(rawCriteria, metrics) {
  const criteria = parseCriteria(rawCriteria);
  if (!criteria || !criteria.type) return false;

  const type = criteria.type;

  switch (type) {
    case 'friends_count': {
      const threshold = Number(criteria.threshold) || 0;
      return (metrics.friendsCount || 0) >= threshold;
    }

    case 'games_completed': {
      const threshold = Number(criteria.threshold) || 0;
      return (metrics.gamesCompleted || 0) >= threshold;
    }

    case 'distance_travelled': {
      const factor = (criteria.unit === 'km' || !criteria.unit) ? 1000 : 1;
      const thresholdMeters = (Number(criteria.threshold) || 0) * factor;
      return (metrics.distanceWalkedM || 0) >= thresholdMeters;
    }

    case 'games_created': {
      const threshold = Number(criteria.threshold) || 0;
      return (metrics.gamesCreated || 0) >= threshold;
    }

    case 'feedback_submitted': {
      const threshold = Number(criteria.threshold) || 1;
      return (metrics.feedbackSubmitted || 0) >= threshold;
    }

    case 'report_upheld': {
      const threshold = Number(criteria.threshold) || 1;
      return (metrics.reportsUpheld || 0) >= threshold;
    }

    case 'trust_score': {
      const op = criteria.operator || '==';
      const threshold = Number(criteria.threshold);
      const score = Number(metrics.trustScore);

      if (op === '<') return score < threshold;
      if (op === '<=') return score <= threshold;
      if (op === '>') return score > threshold;
      if (op === '>=') return score >= threshold;
      if (op === '==' || op === '=') return score === threshold;
      return false;
    }

    case 'first_to_complete_game':
      return Boolean(metrics.firstToCompleteGame);

    case 'game_completed_no_failures':
      return Boolean(metrics.gameCompletedNoFailures);

    case 'game_failed_first_attempt':
      return Boolean(metrics.gameFailedFirstAttempt);

    default:
      return false;
  }
}

/**
 * Main service method: evaluates all unearned badges for a given user,
 * awards those whose criteria are satisfied, optionally sends notifications,
 * and returns the newly awarded badges.
 *
 * @param {number|string} userId
 * @returns {Promise<Array>} newly awarded badge objects
 */
async function evaluateAndAwardBadges(userId) {
  if (!userId) return [];
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) return [];

  // 1. Get all system badges
  const allBadges = await Badge.findAll();
  if (!allBadges || allBadges.length === 0) return [];

  // 2. Get already awarded badge IDs for this user
  const awardedEntries = await UserBadge.findAll({
    where: { user_id: numericUserId },
    attributes: ['badge_id']
  });
  const awardedBadgeIds = new Set(awardedEntries.map(b => b.badge_id));

  // 3. Filter down to unearned badges
  const unearnedBadges = allBadges.filter(b => !awardedBadgeIds.has(b.badge_id));
  if (unearnedBadges.length === 0) return [];

  // 4. Collect criteria types needed so we only query what's necessary
  const neededTypes = new Set();
  for (const badge of unearnedBadges) {
    const c = parseCriteria(badge.award_criteria);
    if (c && c.type) neededTypes.add(c.type);
  }

  // 5. Aggregate metrics
  const metrics = await aggregateUserMetrics(numericUserId, neededTypes);
  if (!metrics) return [];

  // 6. Evaluate criteria and award qualifying badges
  const newlyAwarded = [];

  for (const badge of unearnedBadges) {
    const satisfies = evaluateCriteria(badge.award_criteria, metrics);
    if (satisfies) {
      try {
        const [userBadge, created] = await UserBadge.findOrCreate({
          where: { user_id: numericUserId, badge_id: badge.badge_id },
          defaults: {
            user_id: numericUserId,
            badge_id: badge.badge_id,
            awarded_at: new Date()
          }
        });

        if (created) {
          newlyAwarded.push(badge);

          // Attempt to create in-app notification if model is available
          try {
            if (Notification && typeof Notification.create === 'function') {
              await Notification.create({
                user_id: numericUserId,
                type: 'badge_earned',
                title: `Badge Unlocked: ${badge.name}`,
                body: badge.description || 'You unlocked a new badge!',
                payload_json: { badge_id: badge.badge_id, name: badge.name }
              });
            }
          } catch (notifErr) {
            // Notification creation is best-effort and should never fail the award
          }
        }
      } catch (awardErr) {
        console.error(`Failed to award badge ${badge.badge_id} to user ${numericUserId}:`, awardErr.message);
      }
    }
  }

  return newlyAwarded;
}

module.exports = {
  evaluateAndAwardBadges,
  evaluateCriteria,
  parseCriteria
};
