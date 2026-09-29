const { User } = require('./src/models');
const sequelize = require('./src/config/database');

async function makeAdmin() {
  const username = process.argv[2];
  
  if (!username) {
    console.error('Please provide a username! Example: node make_admin.js my_username');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    const [updatedRows] = await User.update(
      { role: 'admin' },
      { where: { username: username } }
    );

    if (updatedRows > 0) {
      console.log(`✅ Success: User '${username}' is now an admin!`);
    } else {
      console.log(`❌ User '${username}' not found in the database.`);
    }
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

makeAdmin();
