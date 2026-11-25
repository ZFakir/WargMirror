const sequelize = require('../../src/config/database');

jest.mock('../../src/config/database', () => {
  return {
    define: jest.fn((name, attributes, options) => {
      return { name, attributes, options };
    })
  };
});

describe('PlatformSetting Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should define the PlatformSetting model correctly', () => {
    const PlatformSetting = require('../../src/models/PlatformSetting');

    expect(sequelize.define).toHaveBeenCalled();
    expect(sequelize.define.mock.calls[0][0]).toBe('PlatformSetting');

    const attributes = sequelize.define.mock.calls[0][1];
    expect(attributes.setting_key.primaryKey).toBe(true);
    expect(attributes.setting_key.allowNull).toBe(false);
    expect(attributes.setting_value.allowNull).toBe(true);

    const options = sequelize.define.mock.calls[0][2];
    expect(options.tableName).toBe('platform_settings');
    expect(options.timestamps).toBe(true);
    expect(options.createdAt).toBe(false);
    expect(options.updatedAt).toBe('updated_at');
  });
});
