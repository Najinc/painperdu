const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setup complet de PainPerdu...\n');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

try {
  // 1. Reset de la base de données
  console.log('1️⃣  Reset de la base de données...');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('   ✅ Base de données supprimée\n');
  } else {
    console.log('   ℹ️  Aucune base de données existante\n');
  }

  // 2. Démarrage du serveur pour créer les tables
  console.log('2️⃣  Création des tables...');
  console.log('   🔄 Démarrage temporaire du serveur...');

  // Lancer le serveur en arrière-plan pour créer les tables
  const serverProcess = require('child_process').spawn('node', ['server.js'], {
    stdio: 'pipe',
    cwd: path.join(__dirname, '..')
  });

  // Attendre que le serveur soit prêt
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Timeout du serveur'));
    }, 10000);

    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('🚀 Serveur démarré')) {
        clearTimeout(timeout);
        serverProcess.kill();
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Erreur serveur:', data.toString());
    });
  });

  console.log('   ✅ Tables créées\n');

  // 3. Création de l'admin
  console.log('3️⃣  Création de l\'administrateur...');
  execSync('node scripts/create-admin.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('   ✅ Admin créé\n');

  // 4. Création des données d'exemple
  console.log('4️⃣  Création des données d\'exemple...');
  execSync('node scripts/create-sample-data.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('   ✅ Données d\'exemple créées\n');

  console.log('🎉 Setup terminé avec succès !');
  console.log('📝 Identifiants admin: admin@gmail.com / admin123');
  console.log('🚀 Vous pouvez maintenant démarrer le serveur avec: npm start');

} catch (error) {
  console.error('❌ Erreur durant le setup:', error.message);
  process.exit(1);
}