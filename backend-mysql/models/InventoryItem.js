const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryItem = sequelize.define('InventoryItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    inventoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'inventories',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'inventory_items',
    timestamps: false,
    indexes: [
      {
        fields: ['inventoryId']
      },
      {
        fields: ['productId']
      },
      {
        unique: true,
        fields: ['inventoryId', 'productId'],
        name: 'unique_product_per_inventory'
      }
    ]
  });

  return InventoryItem;
};