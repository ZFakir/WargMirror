const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/database');

jest.mock('../../src/config/database', () => {
  return {
    define: jest.fn((name, attributes, options) => {
      return { name, attributes, options };
    })
  };
});

describe('TrustEvent Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should define the TrustEvent model correctly', () => {
    // Require the model
    const TrustEvent = require('../../src/models/TrustEvent');

    // Verify sequelize.define was called
    expect(sequelize.define).toHaveBeenCalled();

    // Verify the model name
    expect(sequelize.define.mock.calls[0][0]).toBe('TrustEvent');
  });
});
