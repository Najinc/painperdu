const mongoose = require('mongoose');

const inventoryEntrySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'La quantité ne peut pas être négative']
  }
});

const inventorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'La date est requise'],
    default: Date.now
  },
  type: {
    type: String,
    enum: ['ouverture', 'fermeture'],
    required: [true, 'Le type d\'inventaire est requis']
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'La vendeuse est requise']
  },
  items: [inventoryEntrySchema],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères']
  },
  totalValue: {
    type: Number,
    default: 0,
    min: 0
  },
  isConfirmed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculer la valeur totale avant sauvegarde
inventorySchema.pre('save', async function (next) {
  if (this.isModified('items')) {
    try {
      await this.populate('items.product');
      this.totalValue = this.items.reduce((total, item) => {
        return total + (item.quantity * item.product.price);
      }, 0);
    } catch (error) {
      next(error);
    }
  }
  next();
});

// Index composé pour éviter les doublons
inventorySchema.index({ date: 1, type: 1, seller: 1 });
inventorySchema.index({ seller: 1, date: -1 });
inventorySchema.index({ type: 1, date: -1 });

module.exports = mongoose.model('Inventory', inventorySchema);