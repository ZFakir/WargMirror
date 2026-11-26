const {
  DEMO_SETTING_KEY,
  getDemoArgId,
  getDemoArg,
  isDemoArg,
  setDemoArgId,
  evaluateDemoConditions
} = require('../../src/services/demoService');

const { PlatformSetting, Arg } = require('../../src/models');

jest.mock('../../src/models', () => ({
  PlatformSetting: {
    findByPk: jest.fn(),
    upsert: jest.fn(),
    destroy: jest.fn()
  },
  Arg: {
    findByPk: jest.fn()
  },
  User: {}
}));

describe('demoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDemoArgId', () => {
    it('returns null when no setting exists', async () => {
      PlatformSetting.findByPk.mockResolvedValue(null);
      expect(await getDemoArgId()).toBeNull();
    });

    it('parses and returns a valid positive integer arg_id', async () => {
      PlatformSetting.findByPk.mockResolvedValue({ setting_key: DEMO_SETTING_KEY, setting_value: '7' });
      expect(await getDemoArgId()).toBe(7);
    });

    it('returns null for non-numeric or non-positive values', async () => {
      PlatformSetting.findByPk.mockResolvedValue({ setting_key: DEMO_SETTING_KEY, setting_value: 'abc' });
      expect(await getDemoArgId()).toBeNull();
    });
  });

  describe('getDemoArg & isDemoArg', () => {
    it('returns null when arg is missing or retired', async () => {
      PlatformSetting.findByPk.mockResolvedValue({ setting_value: '3' });
      Arg.findByPk.mockResolvedValue({ arg_id: 3, status: 'retired' });
      expect(await getDemoArg()).toBeNull();
      expect(await isDemoArg(3)).toBe(false);
    });

    it('returns the ARG and matches isDemoArg when active', async () => {
      PlatformSetting.findByPk.mockResolvedValue({ setting_value: '5' });
      const mockArg = { arg_id: 5, title: 'Innovation Demo', status: 'published' };
      Arg.findByPk.mockResolvedValue(mockArg);

      expect(await getDemoArg()).toBe(mockArg);
      expect(await isDemoArg('5')).toBe(true);
      expect(await isDemoArg('9')).toBe(false);
      expect(await isDemoArg('invalid')).toBe(false);
    });
  });

  describe('setDemoArgId', () => {
    it('clears the demo setting when passed null or empty string', async () => {
      PlatformSetting.destroy.mockResolvedValue(1);
      const res = await setDemoArgId(null);
      expect(PlatformSetting.destroy).toHaveBeenCalledWith({ where: { setting_key: DEMO_SETTING_KEY } });
      expect(res).toEqual({ demo_arg_id: null, game: null });
    });

    it('throws 404 when the target game does not exist', async () => {
      Arg.findByPk.mockResolvedValue(null);
      await expect(setDemoArgId(99)).rejects.toMatchObject({ status: 404, message: 'Game not found' });
    });

    it('throws 400 when the target game is retired', async () => {
      Arg.findByPk.mockResolvedValue({ arg_id: 4, status: 'retired' });
      await expect(setDemoArgId(4)).rejects.toMatchObject({ status: 400 });
    });

    it('upserts the setting when valid', async () => {
      const mockArg = { arg_id: 2, title: 'Campus Trail', status: 'published' };
      Arg.findByPk.mockResolvedValue(mockArg);
      PlatformSetting.upsert.mockResolvedValue([{}, true]);

      const res = await setDemoArgId(2);
      expect(PlatformSetting.upsert).toHaveBeenCalledWith({
        setting_key: DEMO_SETTING_KEY,
        setting_value: '2'
      });
      expect(res).toEqual({ demo_arg_id: 2, game: mockArg });
    });
  });

  describe('evaluateDemoConditions', () => {
    it('returns true when conditions are empty or null', () => {
      expect(evaluateDemoConditions({ attempts: {} }, null)).toBe(true);
      expect(evaluateDemoConditions({ attempts: {} }, [])).toBe(true);
    });

    it('evaluates stringified conditions with OR per game_id', () => {
      const demoData = { attempts: { '12': { outcome: 'pass' } } };
      expect(evaluateDemoConditions(demoData, '[{"game_id": 12, "outcome": "pass"}]')).toBe(true);
      expect(evaluateDemoConditions(demoData, [{ game_id: 12, outcome: 'fail' }])).toBe(false);
    });
  });
});
