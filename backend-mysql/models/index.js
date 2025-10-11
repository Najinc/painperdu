const { Sequelize } = require('sequelize');
const sequelize = require('../config/database-adaptive');

// Import des modèles
const User = require('./User')(sequelize);
const Category = require('./Category')(sequelize);
const Product = require('./Product')(sequelize);
const Inventory = require('./Inventory')(sequelize);
const InventoryItem = require('./InventoryItem')(sequelize);
const Schedule = require('./Schedule')(sequelize);

// Définition des associations
const setupAssociations = () => {
  // User associations
  User.hasMany(Category, { foreignKey: 'createdBy', as: 'createdCategories' });
  User.hasMany(Product, { foreignKey: 'createdBy', as: 'createdProducts' });
  User.hasMany(Inventory, { foreignKey: 'seller', as: 'inventories' });
  User.hasMany(Schedule, { foreignKey: 'seller', as: 'userSchedules' });

  // Category associations
  Category.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Category.hasMany(Product, { foreignKey: 'category', as: 'products' });

  // Product associations
  Product.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Product.belongsTo(Category, { foreignKey: 'category', as: 'categoryInfo' });
  Product.hasMany(InventoryItem, { foreignKey: 'productId', as: 'inventoryItems' });

  // Inventory associations
  Inventory.belongsTo(User, { foreignKey: 'seller', as: 'sellerInfo' });
  Inventory.hasMany(InventoryItem, { foreignKey: 'inventoryId', as: 'items' });

  // InventoryItem associations
  InventoryItem.belongsTo(Inventory, { foreignKey: 'inventoryId', as: 'inventory' });
  InventoryItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // Schedule associations
  Schedule.belongsTo(User, { foreignKey: 'seller', as: 'user' });
};

setupAssociations();

const db = {
  sequelize,
  Sequelize,
  User,
  Category,
  Product,
  Inventory,
  InventoryItem,
  Schedule
};

module.exports = db;