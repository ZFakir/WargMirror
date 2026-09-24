require('dotenv').config();
const { Sequelize } = require('sequelize');

const url = process.env.DATABASE_URL.replace('?ssl-mode=REQUIRED', '');
const sequelize = new Sequelize(url, {
  dialect: 'mysql',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

const sql = `ALTER TABLE minigames MODIFY COLUMN game_type ENUM('gps_proximity','text_answer','qr_barcode','ar_object_scan','colour_match','shape_match','photo_submit','texture_match','sift_match','symmetry_finder') NOT NULL;`;

sequelize.authenticate()
  .then(() => {
    console.log('Connected to production DB...');
    return sequelize.query(sql);
  })
  .then(() => {
    console.log('SUCCESS: minigames ENUM updated!');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
