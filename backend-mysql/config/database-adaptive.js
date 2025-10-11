const { Sequelize } = require('sequelize');
require('dotenv').config();

const createSequelizeInstance = () => {
  if (process.env.NODE_ENV === 'development' && !process.env.DB_HOST) {
    console.log('📁 Utilisation de SQLite pour le développement local');
    return new Sequelize({
      dialect: 'sqlite',
      storage: './database.sqlite',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: false,
      },
    });
  }

  console.log('🗄️  Utilisation de MySQL');
  return new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
};

const sequelize = createSequelizeInstance();

module.exports = sequelize;