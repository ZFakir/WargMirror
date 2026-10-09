const sequelize = require('./src/config/database');

async function run() {
  const [results] = await sequelize.query(`
    SELECT arg_id, waypoint_id, title, ST_AsText(location) as wkt, location
    FROM waypoints
    ORDER BY waypoint_id DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
