const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Category,
  Product,
  Inventory,
  InventoryItem,
  Schedule
} = require('../models');

const createSampleData = async () => {
  try {
    console.log('📊 Création des données d\'exemple...\n');

    // Test de connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    // Synchroniser les modèles
    await sequelize.sync();
    console.log('✅ Modèles synchronisés');

    // Créer un admin si aucun n'existe
    let admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      admin = await User.create({
        username: 'admin',
        email: 'admin@painperdu.com',
        password: 'admin123', // Le hashage sera fait automatiquement par le hook beforeSave
        firstName: 'Admin',
        lastName: 'PainPerdu',
        role: 'admin',
        isActive: true
      });
      console.log('✅ Administrateur créé (admin / admin123)');
    } else {
      console.log('ℹ️  Administrateur existant trouvé');
    }

    // Créer des vendeuses si elles n'existent pas
    const sellers = [
      { username: 'marie', email: 'marie@painperdu.com', firstName: 'Marie', lastName: 'Dupont' },
      { username: 'sophie', email: 'sophie@painperdu.com', firstName: 'Sophie', lastName: 'Martin' }
    ];

    const createdSellers = [];
    for (const sellerData of sellers) {
      let seller = await User.findOne({ where: { username: sellerData.username } });
      if (!seller) {
        seller = await User.create({
          ...sellerData,
          password: 'password123', // Le hashage sera fait automatiquement par le hook beforeSave
          role: 'vendeuse',
          isActive: true
        });
        console.log(`✅ Vendeuse créée: ${seller.username} / password123`);
      }
      createdSellers.push(seller);
    }

    // Créer des catégories
    const categoriesData = [
      { name: 'Pain Perdu Classique', color: '#FF6B6B', createdBy: admin.id },
      { name: 'Pain Perdu Sucré', color: '#4ECDC4', createdBy: admin.id },
      { name: 'Pain Perdu Salé', color: '#45B7D1', createdBy: admin.id },
      { name: 'Accompagnements', color: '#96CEB4', createdBy: admin.id },
      { name: 'Boissons', color: '#FFEAA7', createdBy: admin.id }
    ];

    const categories = [];
    for (const categoryData of categoriesData) {
      let category = await Category.findOne({ where: { name: categoryData.name } });
      if (!category) {
        category = await Category.create(categoryData);
        console.log(`✅ Catégorie créée: ${category.name}`);
      }
      categories.push(category);
    }

    // Créer des produits
    const productsData = [
      { name: 'Pain Perdu Nature', categoryIndex: 0, price: 3.50, description: 'Pain perdu traditionnel' },
      { name: 'Pain Perdu aux Fruits', categoryIndex: 1, price: 4.00, description: 'Avec fruits de saison' },
      { name: 'Pain Perdu Chocolat', categoryIndex: 1, price: 4.50, description: 'Avec pépites de chocolat' },
      { name: 'Pain Perdu Fromage', categoryIndex: 2, price: 5.00, description: 'Version salée au fromage' },
      { name: 'Confiture Maison', categoryIndex: 3, price: 2.00, description: 'Pot de confiture artisanale', unit: 'pot' },
      { name: 'Café', categoryIndex: 4, price: 1.50, description: 'Café filtre', unit: 'tasse' },
      { name: 'Thé', categoryIndex: 4, price: 1.20, description: 'Thé varié', unit: 'tasse' }
    ];

    const products = [];
    for (const productData of productsData) {
      let product = await Product.findOne({ where: { name: productData.name } });
      if (!product) {
        const { categoryIndex, ...data } = productData;
        product = await Product.create({
          ...data,
          category: categories[categoryIndex].id,
          createdBy: admin.id,
          isActive: true
        });
        console.log(`✅ Produit créé: ${product.name} - ${product.price}€`);
      }
      products.push(product);
    }

    // Créer des horaires pour les vendeuses (semaine en cours)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi

    for (let i = 0; i < 5; i++) { // Lundi à vendredi
      const scheduleDate = new Date(startOfWeek);
      scheduleDate.setDate(startOfWeek.getDate() + i);

      for (const seller of createdSellers) {
        const existingSchedule = await Schedule.findOne({
          where: {
            seller: seller.id,
            date: scheduleDate
          }
        });

        if (!existingSchedule) {
          await Schedule.create({
            seller: seller.id,
            date: scheduleDate,
            startTime: i % 2 === 0 ? '08:00' : '14:00',
            endTime: i % 2 === 0 ? '14:00' : '18:00',
            notes: i % 2 === 0 ? 'Marché Central' : 'Place de la République',
            isActive: true
          });
        }
      }
    }
    console.log('✅ Horaires créés pour la semaine');

    console.log('\n🎉 Données d\'exemple créées avec succès!');
    console.log('\n👥 Comptes créés:');
    console.log('   Admin: admin / admin123');
    console.log('   Vendeuses: marie / password123, sophie / password123');
    console.log('\n📊 Données créées:');
    console.log(`   - ${categories.length} catégories`);
    console.log(`   - ${products.length} produits`);
    console.log('   - Horaires pour la semaine');

  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit();
  }
};

createSampleData();