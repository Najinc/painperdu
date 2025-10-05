const mongoose = require('mongoose');

// Schémas simplifiés
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);

async function createSampleData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/painperdu?authSource=admin');
    console.log('Connecté à MongoDB');

    // Créer des catégories
    const categories = [
      { name: 'Viennoiseries', description: 'Croissants, pains au chocolat, etc.' },
      { name: 'Pains', description: 'Baguettes, pains de campagne, etc.' },
      { name: 'Pâtisseries', description: 'Gâteaux, tartes, éclairs, etc.' }
    ];

    for (const catData of categories) {
      const existing = await Category.findOne({ name: catData.name });
      if (!existing) {
        const category = new Category(catData);
        await category.save();
        console.log(`Catégorie "${catData.name}" créée`);
      }
    }

    // Créer des produits
    const viennoiseries = await Category.findOne({ name: 'Viennoiseries' });
    const pains = await Category.findOne({ name: 'Pains' });
    const patisseries = await Category.findOne({ name: 'Pâtisseries' });

    const products = [
      { name: 'Croissant', description: 'Croissant au beurre', category: viennoiseries._id, price: 1.20 },
      { name: 'Pain au chocolat', description: 'Pain au chocolat artisanal', category: viennoiseries._id, price: 1.30 },
      { name: 'Baguette tradition', description: 'Baguette de tradition française', category: pains._id, price: 1.10 },
      { name: 'Pain de campagne', description: 'Pain de campagne au levain', category: pains._id, price: 2.50 },
      { name: 'Éclair au chocolat', description: 'Éclair fourré à la crème pâtissière au chocolat', category: patisseries._id, price: 2.80 },
      { name: 'Tarte aux pommes', description: 'Tarte aux pommes maison', category: patisseries._id, price: 18.50 }
    ];

    for (const prodData of products) {
      const existing = await Product.findOne({ name: prodData.name });
      if (!existing) {
        const product = new Product(prodData);
        await product.save();
        console.log(`Produit "${prodData.name}" créé`);
      }
    }

    console.log('Données d\'exemple créées avec succès!');

  } catch (error) {
    console.error('Erreur lors de la création des données:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createSampleData();