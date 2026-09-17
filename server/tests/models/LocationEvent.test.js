const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/database');

jest.mock('../../src/config/database', () => {
  return {
    define: jest.fn((name, attributes, options) => {
      return { name, attributes, options };
    })
  };
});

describe('LocationEvent Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should define the LocationEvent model correctly', () => {
    // Require the model
    const LocationEvent = require('../../src/models/LocationEvent');

    // Verify sequelize.define was called
    expect(sequelize.define).toHaveBeenCalled();

    // Verify the model name
    expect(sequelize.define.mock.calls[0][0]).toBe('LocationEvent');
  });
});
