const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Configuration PainPerdu pour cPanel');
console.log('=====================================\n');

const questions = [
  { key: 'DB_HOST', prompt: 'Host de la base de données (généralement localhost): ', default: 'localhost' },
  { key: 'DB_NAME', prompt: 'Nom de la base de données: ' },
  { key: 'DB_USER', prompt: 'Utilisateur de la base de données: ' },
  { key: 'DB_PASSWORD', prompt: 'Mot de passe de la base de données: ' },
  { key: 'JWT_SECRET', prompt: 'Secret JWT (laissez vide pour génération automatique): ', default: '' },
  { key: 'FRONTEND_URL', prompt: 'URL du frontend (ex: https://votre-domaine.com): ' },
  { key: 'PORT', prompt: 'Port du serveur (généralement 3000 sur cPanel): ', default: '3000' }
];

const config = {};
let currentQuestionIndex = 0;

function askQuestion() {
  if (currentQuestionIndex >= questions.length) {
    generateConfig();
    return;
  }

  const question = questions[currentQuestionIndex];
  const prompt = question.prompt + (question.default ? `(${question.default}) ` : '');

  rl.question(prompt, (answer) => {
    config[question.key] = answer.trim() || question.default || '';
    currentQuestionIndex++;
    askQuestion();
  });
}

function generateJWTSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateConfig() {
  // Générer un secret JWT si non fourni
  if (!config.JWT_SECRET) {
    config.JWT_SECRET = generateJWTSecret();
    console.log('\n🔐 Secret JWT généré automatiquement');
  }

  // Créer le contenu du fichier .env
  const envContent = `# Configuration PainPerdu - cPanel
# Généré le ${new Date().toLocaleString()}

# Base de données MySQL
DB_HOST=${config.DB_HOST}
DB_PORT=3306
DB_NAME=${config.DB_NAME}
DB_USER=${config.DB_USER}
DB_PASSWORD=${config.DB_PASSWORD}

# JWT
JWT_SECRET=${config.JWT_SECRET}
JWT_EXPIRE=24h

# Serveur
PORT=${config.PORT}
NODE_ENV=production

# Frontend
FRONTEND_URL=${config.FRONTEND_URL}
`;

  // Sauvegarder le fichier .env
  fs.writeFileSync(path.join(__dirname, 'backend-mysql', '.env'), envContent);

  console.log('\n✅ Configuration sauvegardée dans backend-mysql/.env');
  console.log('\n📋 Prochaines étapes:');
  console.log('1. Uploadez le dossier backend-mysql sur votre serveur cPanel');
  console.log('2. Connectez-vous en SSH ou utilisez le gestionnaire de fichiers');
  console.log('3. Naviguez vers le dossier de votre application');
  console.log('4. Exécutez: npm install');
  console.log('5. Exécutez: npm start');
  console.log('\n🔧 Commandes utiles:');
  console.log('- Créer un admin: npm run create-admin');
  console.log('- Créer des données de test: npm run create-sample-data');
  console.log('- Démarrer en mode développement: npm run dev');

  console.log('\n📄 Structure des fichiers uploadés:');
  console.log('backend-mysql/');
  console.log('├── server.js');
  console.log('├── package.json');
  console.log('├── .env');
  console.log('├── config/');
  console.log('├── models/');
  console.log('├── routes/');
  console.log('├── middleware/');
  console.log('└── scripts/');

  rl.close();
}

// Démarrer le processus de configuration
askQuestion();