const { sequelize } = require('../models');

const initializeProduction = async () => {
  try {
    console.log('🚀 Initialisation de la base de données de production...');

    // Test de connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à MySQL établie');

    // Synchroniser les modèles (créer les tables)
    await sequelize.sync({ force: false }); // force: false pour ne pas supprimer les données existantes
    console.log('✅ Tables synchronisées');

    console.log('🎉 Base de données de production initialisée avec succès!');
    console.log('');
    console.log('📝 Prochaines étapes :');
    console.log('1. Exécuter: node scripts/create-sample-data.js (pour les données de base)');
    console.log('2. Créer un compte admin via l\'interface ou le script');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
};

initializeProduction();