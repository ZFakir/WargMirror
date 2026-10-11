'use strict';

const fs = require('fs');
const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('../src/config/database');

const migrationsPath = path.resolve(__dirname, '../src/migrations');
const unsafeMigrationPattern = /\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i;

function assertMigrationsAreSafe(directory = migrationsPath) {
  for (const file of fs.readdirSync(directory).filter((entry) => entry.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(directory, file), 'utf8');
    if (unsafeMigrationPattern.test(source)) {
      throw new Error(`Refusing to run unsafe migration: ${file}`);
    }
  }
}

function createMigrator(database = sequelize) {
  assertMigrationsAreSafe();
  return new Umzug({
    migrations: { glob: path.join(migrationsPath, '*.js') },
    context: database.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize: database }),
    logger: console
  });
}

async function executeMigrationCommand(migrator, command = 'up', logger = console) {
  if (command === '--status') {
    const [executed, pending] = await Promise.all([migrator.executed(), migrator.pending()]);
    logger.log(`Executed migrations: ${executed.map((migration) => migration.name).join(', ') || 'none'}`);
    logger.log(`Pending migrations: ${pending.map((migration) => migration.name).join(', ') || 'none'}`);
    return;
  }

  if (command === '--undo') {
    const migration = await migrator.down({ step: 1 });
    logger.log(migration ? `Reverted migration: ${migration.name}` : 'No migration to revert.');
    return;
  }

  if (command !== 'up') {
    throw new Error(`Unknown migration command: ${command}`);
  }

  const migrations = await migrator.up();
  logger.log(migrations.length ? `Applied migrations: ${migrations.map((migration) => migration.name).join(', ')}` : 'Database is up to date.');
}

async function run() {
  const migrator = createMigrator();

  try {
    await executeMigrationCommand(migrator, process.argv[2] || 'up');
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { assertMigrationsAreSafe, createMigrator, executeMigrationCommand, run };
