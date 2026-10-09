const { LocationEvent } = require('./src/models');
const sequelize = require('./src/config/database');

async function run() {
  try {
    await LocationEvent.create({
      user_id: 1,
      location: sequelize.fn('ST_GeomFromText', 'POINT(-33.8688 151.2093)', 4326),
      accuracy_m: 5
    });
    console.log("Success with lat-lng POINT!");
  } catch (err) {
    console.error("Error with lat-lng POINT:", err.message);
  }

  process.exit();
}
run();
