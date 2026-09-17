const { DataTypes } = require('sequelize');
const sequelize = require('../../src/config/database');

jest.mock('../../src/config/database', () => {
  return {
    define: jest.fn((name, attributes, options) => {
      return { name, attributes, options };
    })
  };
});

describe('Arg Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should define the Arg model correctly', () => {
    // Require the model
    const Arg = require('../../src/models/Arg');

    // Verify sequelize.define was called
    expect(sequelize.define).toHaveBeenCalled();

    // Verify the model name
    expect(sequelize.define.mock.calls[0][0]).toBe('Arg');

    // Verify some key attributes
    const attributes = sequelize.define.mock.calls[0][1];
    expect(attributes.arg_id.primaryKey).toBe(true);
    expect(attributes.title.allowNull).toBe(false);
    expect(attributes.status.defaultValue).toBe('unpublished');

    // Verify options
    const options = sequelize.define.mock.calls[0][2];
    expect(options.tableName).toBe('args');
    expect(options.timestamps).toBe(true);
  });
});
