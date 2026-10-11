const {
  evaluateCriteria,
  parseCriteria,
  evaluateAndAwardBadges
} = require('../../src/services/badgeService');

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
} = require('../../src/models');

jest.mock('../../src/models', () => ({
  Badge: { findAll: jest.fn() },
  UserBadge: { findAll: jest.fn(), findOrCreate: jest.fn() },
  User: { findByPk: jest.fn() },
  FriendRequest: { count: jest.fn() },
  GameSession: { findAll: jest.fn(), count: jest.fn(), sum: jest.fn(), findOne: jest.fn() },
  Waypoint: { findAll: jest.fn() },
  WaypointProgress: { findOne: jest.fn() },
  Minigame: { findAll: jest.fn() },
  MinigameAttempt: { findOne: jest.fn() },
  Arg: { count: jest.fn() },
  UserFeedback: { count: jest.fn() },
  Flag: { count: jest.fn() },
  Notification: { create: jest.fn() }
}));

describe('badgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseCriteria', () => {
    it('should return null for null/undefined/empty input', () => {
      expect(parseCriteria(null)).toBeNull();
      expect(parseCriteria(undefined)).toBeNull();
      expect(parseCriteria('')).toBeNull();
    });

    it('should return object directly if already an object', () => {
      const criteria = { type: 'friends_count', threshold: 10 };
      expect(parseCriteria(criteria)).toBe(criteria);
    });

    it('should parse valid JSON string', () => {
      const str = '{"type": "games_completed", "threshold": 5}';
      expect(parseCriteria(str)).toEqual({ type: 'games_completed', threshold: 5 });
    });

    it('should return null on invalid JSON string', () => {
      expect(parseCriteria('{not-json')).toBeNull();
    });
  });

  describe('evaluateCriteria', () => {
    it('evaluates friends_count correctly', () => {
      const c = { type: 'friends_count', threshold: 10 };
      expect(evaluateCriteria(c, { friendsCount: 9 })).toBe(false);
      expect(evaluateCriteria(c, { friendsCount: 10 })).toBe(true);
      expect(evaluateCriteria(c, { friendsCount: 15 })).toBe(true);
    });

    it('evaluates games_completed correctly', () => {
      const c = { type: 'games_completed', threshold: 5 };
      expect(evaluateCriteria(c, { gamesCompleted: 4 })).toBe(false);
      expect(evaluateCriteria(c, { gamesCompleted: 5 })).toBe(true);
      expect(evaluateCriteria(c, { gamesCompleted: 10 })).toBe(true);
    });

    it('evaluates distance_travelled in km correctly', () => {
      const c = { type: 'distance_travelled', threshold: 5, unit: 'km' };
      expect(evaluateCriteria(c, { distanceWalkedM: 4999 })).toBe(false);
      expect(evaluateCriteria(c, { distanceWalkedM: 5000 })).toBe(true);
      expect(evaluateCriteria(c, { distanceWalkedM: 10000 })).toBe(true);
    });

    it('evaluates distance_travelled without unit defaulting to km', () => {
      const c = { type: 'distance_travelled', threshold: 10 };
      expect(evaluateCriteria(c, { distanceWalkedM: 9999 })).toBe(false);
      expect(evaluateCriteria(c, { distanceWalkedM: 10000 })).toBe(true);
    });

    it('evaluates games_created correctly', () => {
      const c = { type: 'games_created', threshold: 3 };
      expect(evaluateCriteria(c, { gamesCreated: 2 })).toBe(false);
      expect(evaluateCriteria(c, { gamesCreated: 3 })).toBe(true);
    });

    it('evaluates feedback_submitted correctly', () => {
      const c = { type: 'feedback_submitted', threshold: 1 };
      expect(evaluateCriteria(c, { feedbackSubmitted: 0 })).toBe(false);
      expect(evaluateCriteria(c, { feedbackSubmitted: 1 })).toBe(true);
    });

    it('evaluates report_upheld correctly', () => {
      const c = { type: 'report_upheld', threshold: 1 };
      expect(evaluateCriteria(c, { reportsUpheld: 0 })).toBe(false);
      expect(evaluateCriteria(c, { reportsUpheld: 2 })).toBe(true);
    });

    it('evaluates trust_score with different operators', () => {
      const lessThan50 = { type: 'trust_score', operator: '<', threshold: 50 };
      expect(evaluateCriteria(lessThan50, { trustScore: 60 })).toBe(false);
      expect(evaluateCriteria(lessThan50, { trustScore: 50 })).toBe(false);
      expect(evaluateCriteria(lessThan50, { trustScore: 45 })).toBe(true);

      const equal100 = { type: 'trust_score', operator: '==', threshold: 100 };
      expect(evaluateCriteria(equal100, { trustScore: 99 })).toBe(false);
      expect(evaluateCriteria(equal100, { trustScore: 100 })).toBe(true);

      const greaterEq = { type: 'trust_score', operator: '>=', threshold: 80 };
      expect(evaluateCriteria(greaterEq, { trustScore: 80 })).toBe(true);
      expect(evaluateCriteria(greaterEq, { trustScore: 79 })).toBe(false);
    });

    it('evaluates boolean special types correctly', () => {
      expect(evaluateCriteria({ type: 'first_to_complete_game' }, { firstToCompleteGame: true })).toBe(true);
      expect(evaluateCriteria({ type: 'first_to_complete_game' }, { firstToCompleteGame: false })).toBe(false);

      expect(evaluateCriteria({ type: 'game_completed_no_failures' }, { gameCompletedNoFailures: true })).toBe(true);
      expect(evaluateCriteria({ type: 'game_completed_no_failures' }, { gameCompletedNoFailures: false })).toBe(false);

      expect(evaluateCriteria({ type: 'game_failed_first_attempt' }, { gameFailedFirstAttempt: true })).toBe(true);
      expect(evaluateCriteria({ type: 'game_failed_first_attempt' }, { gameFailedFirstAttempt: false })).toBe(false);
    });

    it('returns false for unknown criteria type', () => {
      expect(evaluateCriteria({ type: 'unknown_special_power' }, {})).toBe(false);
    });
  });

  describe('evaluateAndAwardBadges', () => {
    it('returns empty array if userId is invalid', async () => {
      expect(await evaluateAndAwardBadges(null)).toEqual([]);
      expect(await evaluateAndAwardBadges('not-a-number')).toEqual([]);
    });

    it('returns empty array if no badges exist in the system', async () => {
      Badge.findAll.mockResolvedValue([]);
      expect(await evaluateAndAwardBadges(1)).toEqual([]);
    });

    it('returns empty array if user already earned all badges', async () => {
      Badge.findAll.mockResolvedValue([
        { badge_id: 1, name: 'Badge 1', award_criteria: { type: 'friends_count', threshold: 10 } }
      ]);
      UserBadge.findAll.mockResolvedValue([{ badge_id: 1 }]);

      const result = await evaluateAndAwardBadges(1);
      expect(result).toEqual([]);
      expect(User.findByPk).not.toHaveBeenCalled();
    });

    it('evaluates and awards qualifying badges', async () => {
      const mockBadges = [
        { badge_id: 1, name: 'Friendly Face', description: '10 friends', award_criteria: { type: 'friends_count', threshold: 10 } },
        { badge_id: 2, name: 'Socialite', description: '50 friends', award_criteria: { type: 'friends_count', threshold: 50 } },
        { badge_id: 3, name: 'Challenger', description: '5 games', award_criteria: { type: 'games_completed', threshold: 5 } },
        { badge_id: 4, name: 'Angel', description: 'Trust 100', award_criteria: { type: 'trust_score', operator: '==', threshold: 100 } }
      ];

      Badge.findAll.mockResolvedValue(mockBadges);
      // User currently has no badges
      UserBadge.findAll.mockResolvedValue([]);

      // User state: 12 friends, 5 games completed, trust score 100
      User.findByPk.mockResolvedValue({
        user_id: 1,
        distance_walked_m: 2000,
        trust_score: 100.00
      });
      FriendRequest.count.mockResolvedValue(12);
      GameSession.count.mockResolvedValue(5);

      UserBadge.findOrCreate.mockImplementation(async ({ where }) => {
        return [{ user_id: where.user_id, badge_id: where.badge_id }, true];
      });

      Notification.create.mockResolvedValue({ notification_id: 1 });

      const awarded = await evaluateAndAwardBadges(1);

      // Should award Friendly Face (10 friends met, 50 not met), Challenger (5 games met), Angel (trust 100 met)
      expect(awarded.map(b => b.badge_id)).toEqual([1, 3, 4]);

      // Verify UserBadge.findOrCreate was called for each
      expect(UserBadge.findOrCreate).toHaveBeenCalledTimes(3);

      // Verify notification created
      expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 1,
        type: 'badge_earned',
        title: 'Badge Unlocked: Friendly Face'
      }));
    });

    it('does not re-award badges when findOrCreate returns created = false', async () => {
      Badge.findAll.mockResolvedValue([
        { badge_id: 1, name: 'Friendly Face', award_criteria: { type: 'friends_count', threshold: 10 } }
      ]);
      UserBadge.findAll.mockResolvedValue([]);
      User.findByPk.mockResolvedValue({ user_id: 1, trust_score: 100 });
      FriendRequest.count.mockResolvedValue(15);

      UserBadge.findOrCreate.mockResolvedValue([{ user_id: 1, badge_id: 1 }, false]);

      const awarded = await evaluateAndAwardBadges(1);
      expect(awarded).toEqual([]);
      expect(Notification.create).not.toHaveBeenCalled();
    });

    it('evaluates first_to_complete_game correctly', async () => {
      Badge.findAll.mockResolvedValue([
        { badge_id: 10, name: 'Pioneer', award_criteria: { type: 'first_to_complete_game' } }
      ]);
      UserBadge.findAll.mockResolvedValue([]);
      User.findByPk.mockResolvedValue({ user_id: 5, trust_score: 100 });

      // User completed arg_id 99 on 2026-10-01
      GameSession.findAll.mockResolvedValue([
        { user_id: 5, arg_id: 99, status: 'completed', completed_at: new Date('2026-10-01T12:00:00Z') }
      ]);
      // Earliest completed session for this ARG was by user 5
      GameSession.findOne.mockResolvedValue({
        user_id: 5,
        arg_id: 99,
        status: 'completed'
      });

      UserBadge.findOrCreate.mockResolvedValue([{ user_id: 5, badge_id: 10 }, true]);

      const awarded = await evaluateAndAwardBadges(5);
      expect(awarded.map(b => b.badge_id)).toEqual([10]);
    });

    it('evaluates game_completed_no_failures (Flawless) correctly', async () => {
      Badge.findAll.mockResolvedValue([
        { badge_id: 16, name: 'Flawless', award_criteria: { type: 'game_completed_no_failures', threshold: 1 } }
      ]);
      UserBadge.findAll.mockResolvedValue([]);
      User.findByPk.mockResolvedValue({ user_id: 5, trust_score: 100 });

      GameSession.findAll.mockResolvedValue([
        { user_id: 5, arg_id: 42, status: 'completed', completed_at: new Date() }
      ]);
      Waypoint.findAll.mockResolvedValue([{ waypoint_id: 101 }, { waypoint_id: 102 }]);
      WaypointProgress.findOne.mockResolvedValue(null); // No failed waypoint progress
      Minigame.findAll.mockResolvedValue([{ game_id: 201 }]);
      MinigameAttempt.findOne.mockResolvedValue(null); // No failed attempts

      UserBadge.findOrCreate.mockResolvedValue([{ user_id: 5, badge_id: 16 }, true]);

      const awarded = await evaluateAndAwardBadges(5);
      expect(awarded.map(b => b.badge_id)).toEqual([16]);
    });

    it('evaluates game_failed_first_attempt (Dunce) correctly', async () => {
      Badge.findAll.mockResolvedValue([
        { badge_id: 17, name: 'Dunce', award_criteria: { type: 'game_failed_first_attempt', threshold: 1 } }
      ]);
      UserBadge.findAll.mockResolvedValue([]);
      User.findByPk.mockResolvedValue({ user_id: 5, trust_score: 100 });

      MinigameAttempt.findOne.mockResolvedValue({ outcome: 'fail' });

      UserBadge.findOrCreate.mockResolvedValue([{ user_id: 5, badge_id: 17 }, true]);

      const awarded = await evaluateAndAwardBadges(5);
      expect(awarded.map(b => b.badge_id)).toEqual([17]);
    });
  });
});
