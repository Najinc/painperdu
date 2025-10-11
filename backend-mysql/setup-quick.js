const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { generateJWTSecret } = require('./scripts/generate-jwt-secret');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Configuration rapide de PainPerdu\n');

const setupEnvironment = async () => {
  try {
    // Vérifier si .env existe déjà
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      console.log('⚠️  Un fichier .env existe déjà.');
      const overwrite = await question('Voulez-vous le remplacer ? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('❌ Configuration annulée.');
        rl.close();
        return;
      }
    }

    console.log('🔧 Configuration de l\'environnement...\n');

    // Générer un JWT secret
    console.log('🔐 Génération d\'une clé JWT sécurisée...');
    const jwtSecret = generateJWTSecret();
    console.log('✅ Clé JWT générée\n');

    // Demander l'environnement
    const environment = await question('Environnement (development/production) [development]: ') || 'development';

    let envContent = `# Configuration PainPerdu - Générée automatiquement
NODE_ENV=${environment}
PORT=3001

# JWT Secret (généré automatiquement)
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=86400

# Configuration CORS
CORS_ORIGIN=http://localhost:5173

# Limitation de taux
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_REQUEST_SIZE=10mb

`;

    if (environment === 'production') {
      console.log('\n📊 Configuration MySQL pour la production:');
      const dbHost = await question('Host MySQL: ');
      const dbName = await question('Nom de la base de données: ');
      const dbUser = await question('Utilisateur MySQL: ');
      const dbPassword = await question('Mot de passe MySQL: ');
      const corsOrigin = await question('URL du frontend (CORS) [*]: ') || '*';

      envContent += `# Configuration MySQL (Production)
DB_HOST=${dbHost}
DB_PORT=3306
DB_NAME=${dbName}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}

# CORS pour production
CORS_ORIGIN=${corsOrigin}
`;
    } else {
      envContent += `# Configuration SQLite (Développement local)
# Laissez DB_HOST vide pour utiliser SQLite automatiquement
DB_HOST=
DB_PORT=3306
DB_NAME=painperdu_local
DB_USER=
DB_PASSWORD=
`;
    }

    // Écrire le fichier .env
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Fichier .env créé avec succès!');

    if (environment === 'development') {
      console.log('\n📁 Configuration locale avec SQLite:');
      console.log('   - Aucun serveur MySQL requis');
      console.log('   - Base de données: ./database.sqlite');
      console.log('   - Prêt pour le développement');
    } else {
      console.log('\n🗄️  Configuration MySQL pour production');
      console.log('   - Assurez-vous que MySQL est accessible');
      console.log('   - Vérifiez les permissions de l\'utilisateur');
    }

    console.log('\n🚀 Prochaines étapes:');
    console.log('   1. npm install sqlite3 (pour le développement local)');
    console.log('   2. npm run init-db');
    console.log('   3. npm run create-admin');
    console.log('   4. npm run dev');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
  } finally {
    rl.close();
  }
};

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

setupEnvironment();