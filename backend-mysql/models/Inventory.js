const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    type: {
      type: DataTypes.ENUM('ouverture', 'fermeture'),
      allowNull: false
    },
    seller: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500]
      }
    },
    totalValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    isConfirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'inventories',
    timestamps: true,
    indexes: [
      {
        fields: ['date']
      },
      {
        fields: ['type']
      },
      {
        fields: ['seller']
      },
      {
        fields: ['isConfirmed']
      },
      {
        unique: true,
        fields: ['date', 'type', 'seller'],
        name: 'unique_inventory_per_seller_per_day'
      }
    ]
  });

  return Inventory;
};