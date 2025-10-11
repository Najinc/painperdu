const axios = require('axios');

async function testStatistics() {
  try {
    // D'abord se connecter pour obtenir un token
    console.log('🔐 Connexion en tant qu\'admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@painperdu.com',
      password: 'password'
    });

    const token = loginResponse.data.token;
    console.log('✅ Connexion réussie');

    // Tester l'API des statistiques
    console.log('\n📊 Test de l\'API des statistiques...');
    const statsResponse = await axios.get('http://localhost:5000/api/statistics/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📈 Réponse de l\'API dashboard:');
    console.log(JSON.stringify(statsResponse.data, null, 2));

    // Tester les données de base
    console.log('\n🔍 Test des données de base...');

    // Vérifier les produits
    const productsResponse = await axios.get('http://localhost:5000/api/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`📦 Nombre de produits: ${productsResponse.data.length}`);

    // Vérifier les utilisateurs
    const usersResponse = await axios.get('http://localhost:5000/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`👥 Nombre d'utilisateurs: ${usersResponse.data.length}`);

    // Vérifier les inventaires
    const inventoriesResponse = await axios.get('http://localhost:5000/api/inventory', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`📋 Nombre d'inventaires: ${inventoriesResponse.data.length}`);

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testStatistics();