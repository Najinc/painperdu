const { sequelize } = require('../models');

const initDatabase = async () => {
  try {
    console.log('🔄 Initialisation de la base de données MySQL...\n');

    // Test de connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    // Synchronisation des modèles (création des tables)
    console.log('🔄 Synchronisation des modèles...');
    await sequelize.sync({ force: false }); // force: true pour recréer les tables
    console.log('✅ Tables créées/mises à jour avec succès');

    // Afficher les tables créées
    const dialect = sequelize.getDialect();
    let results;

    if (dialect === 'mysql') {
      [results] = await sequelize.query("SHOW TABLES");
    } else if (dialect === 'sqlite') {
      [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
    }

    console.log('\n📋 Tables dans la base de données:');
    results.forEach(row => {
      const tableName = dialect === 'mysql' ? Object.values(row)[0] : row.name;
      console.log(`   - ${tableName}`);
    });

    console.log('\n🎉 Base de données initialisée avec succès!');
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Exécuter: node scripts/create-admin.js (pour créer un administrateur)');
    console.log('   2. Démarrer le serveur: npm start');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);

    if (error.name === 'SequelizeConnectionError') {
      console.log('\n🔧 Vérifiez votre configuration de base de données dans le fichier .env:');
      console.log('   - DB_HOST');
      console.log('   - DB_PORT');
      console.log('   - DB_NAME');
      console.log('   - DB_USER');
      console.log('   - DB_PASSWORD');
    }
  } finally {
    await sequelize.close();
    process.exit();
  }
};

initDatabase();