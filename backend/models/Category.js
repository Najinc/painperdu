const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de la catégorie est requis'],
    trim: true,
    unique: true,
    maxlength: [100, 'Le nom de la catégorie ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  color: {
    type: String,
    default: '#e27d28',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Couleur invalide (format hexadécimal requis)']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances de recherche
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });

module.exports = mongoose.model('Category', categorySchema);