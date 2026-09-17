module.exports = async () => {
  // Nothing to do globally — each test file closes its own Sequelize
  // connection in an afterAll hook. Kept as a hook point for future use
  // (e.g. dropping the schema, tearing down shared fixtures).
};
