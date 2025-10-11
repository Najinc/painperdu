const readline = require('readline');
const { Op } = require('sequelize');
require('dotenv').config();

const { User, sequelize } = require('../models');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('👤 Création d\'un administrateur PainPerdu');
console.log('=========================================\n');

const createAdmin = async () => {
  try {
    // Test de connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    // Synchroniser les modèles
    await sequelize.sync();
    console.log('✅ Modèles synchronisés\n');

    // Demander les informations de l'admin
    const adminData = {};

    await new Promise((resolve) => {
      rl.question('Nom d\'utilisateur: ', (answer) => {
        adminData.username = answer.trim();
        resolve();
      });
    });

    await new Promise((resolve) => {
      rl.question('Email: ', (answer) => {
        adminData.email = answer.trim();
        resolve();
      });
    });

    await new Promise((resolve) => {
      rl.question('Mot de passe: ', (answer) => {
        adminData.password = answer.trim();
        resolve();
      });
    });

    await new Promise((resolve) => {
      rl.question('Prénom (optionnel): ', (answer) => {
        adminData.firstName = answer.trim() || null;
        resolve();
      });
    });

    await new Promise((resolve) => {
      rl.question('Nom de famille (optionnel): ', (answer) => {
        adminData.lastName = answer.trim() || null;
        resolve();
      });
    });

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: adminData.email },
          { username: adminData.username }
        ]
      }
    });

    if (existingUser) {
      console.log('\n❌ Un utilisateur avec cet email ou nom d\'utilisateur existe déjà');
      process.exit(1);
    }

    // Créer l'administrateur
    const admin = await User.create({
      ...adminData,
      role: 'admin',
      isActive: true
    });

    console.log('\n✅ Administrateur créé avec succès!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Nom d\'utilisateur:', admin.username);
    console.log('🔑 Rôle:', admin.role);

    if (admin.firstName || admin.lastName) {
      console.log('📛 Nom complet:', `${admin.firstName || ''} ${admin.lastName || ''}`.trim());
    }

    console.log('\n🎉 Vous pouvez maintenant vous connecter avec ces identifiants!');

  } catch (error) {
    console.error('\n❌ Erreur lors de la création de l\'administrateur:', error.message);

    if (error.name === 'SequelizeValidationError') {
      console.log('\n📋 Erreurs de validation:');
      error.errors.forEach(err => {
        console.log(`   - ${err.path}: ${err.message}`);
      });
    }
  } finally {
    await sequelize.close();
    rl.close();
    process.exit();
  }
};

createAdmin();