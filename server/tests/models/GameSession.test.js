const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/database');

jest.mock('../../src/config/database', () => {
  return {
    define: jest.fn((name, attributes, options) => {
      return { name, attributes, options };
    })
  };
});

describe('GameSession Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should define the GameSession model correctly', () => {
    // Require the model
    const GameSession = require('../../src/models/GameSession');

    // Verify sequelize.define was called
    expect(sequelize.define).toHaveBeenCalled();

    // Verify the model name
    expect(sequelize.define.mock.calls[0][0]).toBe('GameSession');
  });
});
