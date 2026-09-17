const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/database');

jest.mock('../../src/config/database', () => {
  return {
    define: jest.fn((name, attributes, options) => {
      return { name, attributes, options };
    })
  };
});

describe('WaypointProgress Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should define the WaypointProgress model correctly', () => {
    // Require the model
    const WaypointProgress = require('../../src/models/WaypointProgress');

    // Verify sequelize.define was called
    expect(sequelize.define).toHaveBeenCalled();

    // Verify the model name
    expect(sequelize.define.mock.calls[0][0]).toBe('WaypointProgress');
  });
});
