const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/categories
// @desc    Obtenir toutes les catégories
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { isActive, search } = req.query;

    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const categories = await Category.find(query)
      .populate('createdBy', 'username email')
      .sort({ name: 1 });

    res.json(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/categories/:id
// @desc    Obtenir une catégorie par ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    res.json(category);
  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   POST /api/categories
// @desc    Créer une nouvelle catégorie
// @access  Private (Admin)
router.post('/', [
  auth,
  authorize('admin'),
  body('name')
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ max: 100 })
    .withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Couleur invalide (format hexadécimal requis)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { name, description, color } = req.body;

    // Vérifier si une catégorie avec ce nom existe déjà
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà' });
    }

    const category = new Category({
      name,
      description,
      color,
      createdBy: req.user._id
    });

    await category.save();
    await category.populate('createdBy', 'username email');

    res.status(201).json({
      message: 'Catégorie créée avec succès',
      category
    });
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   PUT /api/categories/:id
// @desc    Mettre à jour une catégorie
// @access  Private (Admin)
router.put('/:id', [
  auth,
  authorize('admin'),
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Couleur invalide (format hexadécimal requis)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { name, description, color, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // Vérifier si le nouveau nom est déjà utilisé
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà' });
      }
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    await category.populate('createdBy', 'username email');

    res.json({
      message: 'Catégorie mise à jour avec succès',
      category
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Supprimer une catégorie (désactiver)
// @access  Private (Admin)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Catégorie non trouvée' });
    }

    // Vérifier s'il y a des produits associés à cette catégorie
    const Product = require('../models/Product');
    const productsCount = await Product.countDocuments({ category: category._id, isActive: true });

    if (productsCount > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer cette catégorie car ${productsCount} produit(s) y sont associés`
      });
    }

    category.isActive = false;
    await category.save();

    res.json({ message: 'Catégorie désactivée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;