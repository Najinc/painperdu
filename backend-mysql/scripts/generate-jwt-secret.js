const crypto = require('crypto');

const generateJWTSecret = () => {
  console.log('🔐 Génération de clés JWT sécurisées\n');

  // Générer plusieurs options
  const secrets = [];

  for (let i = 1; i <= 3; i++) {
    const secret = crypto.randomBytes(64).toString('hex');
    secrets.push(secret);
    console.log(`Option ${i}:`);
    console.log(`JWT_SECRET=${secret}\n`);
  }

  console.log('📋 Instructions:');
  console.log('1. Copiez une des clés ci-dessus');
  console.log('2. Collez-la dans votre fichier .env');
  console.log('3. Remplacez la valeur de JWT_SECRET');
  console.log('\n🔒 Ces clés sont cryptographiquement sécurisées (512 bits)');
  console.log('⚠️  Ne partagez JAMAIS votre clé JWT en production!');

  return secrets[0]; // Retourner la première pour usage programmatique
};

// Si appelé directement
if (require.main === module) {
  generateJWTSecret();
}

module.exports = { generateJWTSecret };