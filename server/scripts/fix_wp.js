const sequelize = require('./src/config/database');

async function run() {
  await sequelize.query(`
    UPDATE waypoints
    SET location = ST_GeomFromText(CONCAT('POINT(', ST_Y(location), ' ', ST_X(location), ')'), 4326)
    WHERE ST_X(location) > 0 AND ST_Y(location) < 0
  `);
  console.log("Fixed reversed coordinates!");
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
