/**
 * Idempotent migration script to add composite performance indexes to MySQL.
 * Safe to run multiple times against Aiven / local MySQL 8.
 */
require('dotenv').config();
const sequelize = require('./src/config/database');

const INDEXES = [
  { table: 'args', name: 'idx_arg_status_created', columns: '(status, created_at)' },
  { table: 'game_sessions', name: 'idx_gs_user_status_active', columns: '(user_id, status, last_active_at)' },
  { table: 'game_sessions', name: 'idx_gs_arg_status_completed', columns: '(arg_id, status, completed_at)' },
  { table: 'location_events', name: 'idx_le_user_susp_time', columns: '(user_id, is_suspicious, recorded_at)' },
  { table: 'friend_requests', name: 'idx_fr_receiver_status', columns: '(receiver_id, status)' },
  { table: 'friend_requests', name: 'idx_fr_sender_status', columns: '(sender_id, status)' },
  { table: 'arg_votes', name: 'idx_av_arg_vote', columns: '(arg_id, vote)' },
  { table: 'comments', name: 'idx_comment_arg_created', columns: '(arg_id, created_at)' },
  { table: 'users', name: 'idx_users_reset_token', columns: '(password_reset_token)' }
];

async function applyIndexes() {
  try {
    await sequelize.authenticate();
    const dbName = sequelize.getDatabaseName();
    console.log(`Connected to database "${dbName}". Checking performance indexes...`);

    for (const idx of INDEXES) {
      const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.STATISTICS
         WHERE table_schema = :dbName
           AND table_name = :tableName
           AND index_name = :indexName`,
        {
          replacements: { dbName, tableName: idx.table, indexName: idx.name },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (Number(rows.cnt) > 0) {
        console.log(`  [skip] ${idx.table}.${idx.name} already exists`);
        continue;
      }

      console.log(`  [add]  CREATE INDEX ${idx.name} ON ${idx.table} ${idx.columns}`);
      await sequelize.query(`CREATE INDEX ${idx.name} ON ${idx.table} ${idx.columns}`);
    }

    console.log('All performance indexes verified/applied.');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to apply performance indexes:', err);
    process.exit(1);
  }
}

applyIndexes();
