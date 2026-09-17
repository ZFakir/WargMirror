const { Sequelize } = require('sequelize');

jest.mock('sequelize', () => {
  return {
    Sequelize: jest.fn()
  };
});
jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('database config', () => {
  it('should initialize Sequelize', () => {
    require('../../src/config/database');
    expect(Sequelize).toHaveBeenCalled();
  });
});
