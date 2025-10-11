const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Schedule = sequelize.define('Schedule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
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
    type: {
      type: DataTypes.ENUM('travail', 'conge', 'maladie'),
      allowNull: false,
      defaultValue: 'travail'
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500]
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'schedules',
    timestamps: true,
    indexes: [
      {
        fields: ['date']
      },
      {
        fields: ['seller']
      },
      {
        fields: ['type']
      },
      {
        fields: ['isActive']
      },
      {
        unique: true,
        fields: ['date', 'seller'],
        name: 'unique_schedule_per_seller_per_day'
      }
    ],
    validate: {
      checkWorkingHours() {
        if (this.type === 'travail' && (!this.startTime || !this.endTime)) {
          throw new Error('Les heures de début et de fin sont requises pour les journées de travail');
        }
      }
    }
  });

  return Schedule;
};