const sequelize = require('./src/config/database');
sequelize.query("ALTER TABLE waypoint_progress MODIFY COLUMN status ENUM('locked', 'unlocked', 'completed', 'skipped', 'failed') NOT NULL DEFAULT 'locked';")
  .then(() => { console.log('Successfully altered waypoint_progress enum'); process.exit(0); })
  .catch(err => { console.error('Error altering table', err); process.exit(1); });
