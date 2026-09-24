const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

module.exports = async () => {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('warg_test')) {
    throw new Error(
      'Refusing to run integration tests: DATABASE_URL does not look like a test database ' +
      '(expected it to contain "warg_test"). Check server/.env.test before running ' +
      '"npm run test:integration" — this guard exists so tests never accidentally wipe a real DB.'
    );
  }


  const { sequelize } = require('../../src/models');

  await sequelize.authenticate();
  // Rebuild the schema from scratch for a clean, deterministic run.
  await sequelize.sync({ force: true });
  await sequelize.close();
};
