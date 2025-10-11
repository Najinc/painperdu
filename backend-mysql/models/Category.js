const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500]
      }
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#e27d28',
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'categories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['createdBy']
      }
    ]
  });

  return Category;
};