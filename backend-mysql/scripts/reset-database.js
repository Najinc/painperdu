const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('🗑️  Reset de la base de données...');

try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Base de données supprimée');
  } else {
    console.log('ℹ️  Aucune base de données à supprimer');
  }
} catch (error) {
  if (error.code === 'EBUSY') {
    console.log('⚠️  Base de données en cours d\'utilisation. Arrêtez d\'abord le serveur.');
  } else {
    console.error('❌ Erreur lors de la suppression:', error.message);
  }
}

console.log('🔄 Relancez le serveur pour créer une nouvelle base de données propre');