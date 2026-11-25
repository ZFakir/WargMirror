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
const { badgesCache } = require('../utils/cache');

/**
 * Safely parse JSON criteria if needed.
 */
function parseCriteria(criteria) {
  if (!criteria) return null;
  if (typeof criteria === 'object') return criteria;
  try {
    return JSON.parse(criteria);
  } catch {
    return null;
  }
}

/**
 * Check whether a user was the first to complete any ARG.
 */
async function checkFirstToComplete(userId, prefetchedSessions = null) {
  try {
    const completedSessions = prefetchedSessions || await GameSession.findAll({
      where: { user_id: userId, status: 'completed' }
    });
    if (!completedSessions || completedSessions.length === 0) return false;

    const earliestResults = await Promise.all(
      completedSessions.map((session) =>
        GameSession.findOne({
          where: { arg_id: session.arg_id, status: 'completed' },
          order: [
            ['completed_at', 'ASC'],
            ['started_at', 'ASC'],
            ['user_id', 'ASC']
          ]
        })
      )
    );

    return earliestResults.some((earliest) => earliest && earliest.user_id === userId);
  } catch (err) {
    console.warn('Error in checkFirstToComplete:', err.message);
    return false;
  }
}

/**
 * Check whether a user completed a game with zero failed waypoints or minigame attempts.
 */
async function checkGameCompletedNoFailures(userId, prefetchedSessions = null) {
  try {
    const completedSessions = prefetchedSessions || await GameSession.findAll({
      where: { user_id: userId, status: 'completed' }
    });
    if (!completedSessions || completedSessions.length === 0) return false;

    const sessionChecks = await Promise.all(
      completedSessions.map(async (session) => {
        const waypoints = await Waypoint.findAll({
          where: { arg_id: session.arg_id },
          attributes: ['waypoint_id']
        });
        const wpIds = waypoints.map(w => w.waypoint_id);
        if (wpIds.length === 0) return false;

        const hasMinigameLookup = Minigame && typeof Minigame.findAll === 'function' && MinigameAttempt && typeof MinigameAttempt.findOne === 'function';

        const [failedProgress, minigames] = await Promise.all([
          Promise.resolve().then(() => WaypointProgress.findOne({
            where: {
              user_id: userId,
              waypoint_id: { [Op.in]: wpIds },
              status: 'failed'
            }
          })),
          hasMinigameLookup
            ? Promise.resolve().then(() => Minigame.findAll({
                where: { waypoint_id: { [Op.in]: wpIds } },
                attributes: ['game_id']
              }))
            : Promise.resolve([])
        ]);

        if (failedProgress) return false;

        if (hasMinigameLookup && minigames && minigames.length > 0) {
          const gameIds = minigames.map(g => g.game_id);
          const failedAttempt = await MinigameAttempt.findOne({
            where: {
              user_id: userId,
              game_id: { [Op.in]: gameIds },
              outcome: 'fail'
            }
          });
          if (failedAttempt) return false;
        }

        return true;
      })
    );

    return sessionChecks.some(Boolean);
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
 * Gather aggregated metrics for a user, only querying what is needed and running
 * independent queries in parallel.
 */
async function aggregateUserMetrics(userId, neededTypes) {
  const metrics = {};

  const user = await User.findByPk(userId, {
    attributes: ['user_id', 'distance_walked_m', 'trust_score']
  });
  if (!user) return null;

  metrics.user = user;
  metrics.distanceWalkedM = user.distance_walked_m || 0;
  metrics.trustScore = user.trust_score !== null && user.trust_score !== undefined
    ? Number(user.trust_score)
    : 100;

  const needsCompletedSessions = neededTypes.has('first_to_complete_game') || neededTypes.has('game_completed_no_failures');
  const completedSessionsPromise = needsCompletedSessions
    ? Promise.resolve().then(() => GameSession.findAll({ where: { user_id: userId, status: 'completed' } })).catch(() => [])
    : Promise.resolve(null);

  const tasks = [];

  if (neededTypes.has('distance_travelled')) {
    tasks.push((async () => {
      try {
        if (GameSession && typeof GameSession.sum === 'function') {
          const sessionDistanceSum = await GameSession.sum('distance_m', { where: { user_id: userId } });
          metrics.distanceWalkedM = Math.max(metrics.distanceWalkedM, sessionDistanceSum || 0);
        }
      } catch {
        // Non-fatal fallback
      }
    })());
  }

  if (neededTypes.has('friends_count')) {
    tasks.push((async () => {
      try {
        metrics.friendsCount = await FriendRequest.count({
          where: {
            [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
            status: 'accepted'
          }
        });
      } catch {
        metrics.friendsCount = 0;
      }
    })());
  }

  if (neededTypes.has('games_completed')) {
    tasks.push((async () => {
      try {
        metrics.gamesCompleted = await GameSession.count({
          where: { user_id: userId, status: 'completed' },
          distinct: true,
          col: 'arg_id'
        });
      } catch {
        metrics.gamesCompleted = 0;
      }
    })());
  }

  if (neededTypes.has('games_created')) {
    tasks.push((async () => {
      try {
        metrics.gamesCreated = await Arg.count({
          where: { creator_id: userId }
        });
      } catch {
        metrics.gamesCreated = 0;
      }
    })());
  }

  if (neededTypes.has('feedback_submitted')) {
    tasks.push((async () => {
      try {
        metrics.feedbackSubmitted = await UserFeedback.count({
          where: { user_id: userId }
        });
      } catch {
        metrics.feedbackSubmitted = 0;
      }
    })());
  }

  if (neededTypes.has('report_upheld')) {
    tasks.push((async () => {
      try {
        metrics.reportsUpheld = await Flag.count({
          where: { reporter_id: userId, status: 'resolved' }
        });
      } catch {
        metrics.reportsUpheld = 0;
      }
    })());
  }

  if (neededTypes.has('first_to_complete_game')) {
    tasks.push((async () => {
      const completedSessions = await completedSessionsPromise;
      metrics.firstToCompleteGame = await checkFirstToComplete(userId, completedSessions);
    })());
  }

  if (neededTypes.has('game_completed_no_failures')) {
    tasks.push((async () => {
      const completedSessions = await completedSessionsPromise;
      metrics.gameCompletedNoFailures = await checkGameCompletedNoFailures(userId, completedSessions);
    })());
  }

  if (neededTypes.has('game_failed_first_attempt')) {
    tasks.push((async () => {
      metrics.gameFailedFirstAttempt = await checkGameFailedFirstAttempt(userId);
    })());
  }

  await Promise.all(tasks);
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

  if (!Badge || typeof Badge.findAll !== 'function' || !UserBadge || typeof UserBadge.findAll !== 'function') {
    return [];
  }

  // 1 & 2. Fetch all system badges and user's earned badge IDs in parallel
  const [allBadges, awardedEntries] = await Promise.all([
    badgesCache.getOrSet('full', 10 * 60 * 1000, () => Badge.findAll()),
    Promise.resolve().then(() => UserBadge.findAll({
      where: { user_id: numericUserId },
      attributes: ['badge_id']
    }))
  ]);

  if (!allBadges || allBadges.length === 0) return [];

  const awardedBadgeIds = new Set((awardedEntries || []).map(b => b.badge_id));

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
  const qualifyingBadges = unearnedBadges.filter(b => evaluateCriteria(b.award_criteria, metrics));
  if (qualifyingBadges.length === 0) return [];

  const awardResults = await Promise.all(
    qualifyingBadges.map(async (badge) => {
      try {
        const [, created] = await UserBadge.findOrCreate({
          where: { user_id: numericUserId, badge_id: badge.badge_id },
          defaults: {
            user_id: numericUserId,
            badge_id: badge.badge_id,
            awarded_at: new Date()
          }
        });
        return created ? badge : null;
      } catch (awardErr) {
        console.error(`Failed to award badge ${badge.badge_id} to user ${numericUserId}:`, awardErr.message);
        return null;
      }
    })
  );

  const newlyAwarded = awardResults.filter(Boolean);

  if (newlyAwarded.length > 0 && Notification && typeof Notification.create === 'function') {
    await Promise.all(
      newlyAwarded.map((badge) =>
        Notification.create({
          user_id: numericUserId,
          type: 'badge_earned',
          title: `Badge Unlocked: ${badge.name}`,
          body: badge.description || 'You unlocked a new badge!',
          payload_json: { badge_id: badge.badge_id, name: badge.name }
        }).catch(() => {})
      )
    );
  }

  return newlyAwarded;
}

module.exports = {
  evaluateAndAwardBadges,
  evaluateCriteria,
  parseCriteria
};
