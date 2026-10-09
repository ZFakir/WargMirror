const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function run() {
  const [results] = await sequelize.query(`
    SELECT arg_id, waypoint_id, title, ST_AsText(location) as loc
    FROM waypoints
    ORDER BY waypoint_id DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
