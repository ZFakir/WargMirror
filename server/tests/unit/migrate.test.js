const fs = require('fs');
const os = require('os');
const path = require('path');
const { assertMigrationsAreSafe, executeMigrationCommand } = require('../../scripts/migrate');

describe('migration safety guard', () => {
  let migrationsDirectory;

  beforeEach(() => {
    migrationsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'warg-migrations-'));
  });

  afterEach(() => {
    fs.rmSync(migrationsDirectory, { recursive: true, force: true });
  });

  it('accepts an additive migration source', () => {
    fs.writeFileSync(path.join(migrationsDirectory, 'safe.js'), "module.exports = { up: () => queryInterface.addColumn('args', 'title', {}), down: () => {} };\n");

    expect(() => assertMigrationsAreSafe(migrationsDirectory)).not.toThrow();
  });

  it.each(['DROP TABLE args;', 'TRUNCATE TABLE args;', 'DELETE FROM args;'])(
    'rejects destructive migration SQL: %s',
    (statement) => {
      fs.writeFileSync(path.join(migrationsDirectory, 'unsafe.js'), `module.exports = { up: () => sequelize.query('${statement}'), down: () => {} };\n`);

      expect(() => assertMigrationsAreSafe(migrationsDirectory)).toThrow('Refusing to run unsafe migration: unsafe.js');
    }
  );
});

describe('migration commands', () => {
  const logger = { log: jest.fn() };

  beforeEach(() => {
    logger.log.mockClear();
  });

  it('runs pending migrations once and reports a no-op second run', async () => {
    const migrator = { up: jest.fn().mockResolvedValueOnce([{ name: 'one.js' }]).mockResolvedValueOnce([]) };

    await executeMigrationCommand(migrator, 'up', logger);
    await executeMigrationCommand(migrator, 'up', logger);

    expect(migrator.up).toHaveBeenCalledTimes(2);
    expect(logger.log).toHaveBeenNthCalledWith(1, 'Applied migrations: one.js');
    expect(logger.log).toHaveBeenNthCalledWith(2, 'Database is up to date.');
  });

  it('reverts exactly one migration for an undo request', async () => {
    const migrator = { down: jest.fn().mockResolvedValue({ name: 'one.js' }) };

    await executeMigrationCommand(migrator, '--undo', logger);

    expect(migrator.down).toHaveBeenCalledWith({ step: 1 });
    expect(logger.log).toHaveBeenCalledWith('Reverted migration: one.js');
  });
});
