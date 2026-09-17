const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/database');

jest.mock('../../src/config/database', () => {
  return {
    define: jest.fn((name, attributes, options) => {
      return { name, attributes, options };
    })
  };
});

describe('Badge Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should define the Badge model correctly', () => {
    // Require the model
    const Badge = require('../../src/models/Badge');

    // Verify sequelize.define was called
    expect(sequelize.define).toHaveBeenCalled();

    // Verify the model name
    expect(sequelize.define.mock.calls[0][0]).toBe('Badge');
  });
});
