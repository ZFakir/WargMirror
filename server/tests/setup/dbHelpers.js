const { sequelize } = require('../../src/models');

if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

/**
 * Truncates every table in the test database. FK checks are disabled
 * around the operation because tables reference each other (e.g. Arg ->
 * User, Waypoint -> Arg) and truncation order otherwise matters.
 *
 * Call this in a beforeEach/afterEach so every integration test starts
 * from a known-empty state, independent of test execution order.
 */
async function resetDatabase() {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = Object.values(sequelize.models).map((m) => m.getTableName());
  for (const table of tables) {
    await sequelize.query(`DELETE FROM \`${table}\``);
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function closeDatabase() {
  await sequelize.close();
}

module.exports = { resetDatabase, closeDatabase, sequelize };
