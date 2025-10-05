const mongoose = require('mongoose');

/**
 * Schéma MongoDB pour les produits de boulangerie
 * Gère les informations produit, prix, stock et statut
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du produit est requis'],
    trim: true,
    maxlength: [100, 'Le nom du produit ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La catégorie est requise']
  },
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut pas être négatif'],
    validate: {
      validator: function (v) {
        return v >= 0 && Number.isFinite(v);
      },
      message: 'Le prix doit être un nombre valide et positif'
    }
  },
  unit: {
    type: String,
    enum: ['pièce', 'kg', 'g', 'litre', 'ml'],
    default: 'pièce'
  },
  minStock: {
    type: Number,
    default: 0,
    min: [0, 'Le stock minimum ne peut pas être négatif']
  },
  maxStock: {
    type: Number,
    default: 100,
    min: [0, 'Le stock maximum ne peut pas être négatif']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  image: {
    type: String,
    trim: true
  },
  nutritionalInfo: {
    calories: { type: Number, min: 0 },
    protein: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fat: { type: Number, min: 0 },
    allergens: [String]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Validation personnalisée pour s'assurer que maxStock >= minStock
productSchema.pre('save', function (next) {
  if (this.maxStock < this.minStock) {
    next(new Error('Le stock maximum doit être supérieur ou égal au stock minimum'));
  }
  next();
});

// Index pour améliorer les performances
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);