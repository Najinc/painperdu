const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { category, isActive, search, page = 1, limit = 20 } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('category', 'name color')
      .populate('createdBy', 'username email')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name color')
      .populate('createdBy', 'username email');

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json(product);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

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
  body('category')
    .notEmpty()
    .withMessage('La catégorie est requise')
    .isMongoId()
    .withMessage('ID de catégorie invalide'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Le prix doit être un nombre positif'),
  body('unit')
    .optional()
    .isIn(['pièce', 'kg', 'g', 'litre', 'ml'])
    .withMessage('Unité invalide'),
  body('minStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Le stock minimum doit être un nombre positif'),
  body('maxStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Le stock maximum doit être un nombre positif')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { name, description, category, price, unit, minStock, maxStock, nutritionalInfo } = req.body;

    // Vérifier que la catégorie existe
    const Category = require('../models/Category');
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Catégorie non trouvée' });
    }

    // Vérifier que maxStock >= minStock
    if (maxStock && minStock && maxStock < minStock) {
      return res.status(400).json({
        message: 'Le stock maximum doit être supérieur ou égal au stock minimum'
      });
    }

    const product = new Product({
      name,
      description,
      category,
      price,
      unit,
      minStock,
      maxStock,
      nutritionalInfo,
      createdBy: req.user._id
    });

    await product.save();
    await product.populate([
      { path: 'category', select: 'name color' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.status(201).json({
      message: 'Produit créé avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

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
  body('category')
    .optional()
    .isMongoId()
    .withMessage('ID de catégorie invalide'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le prix doit être un nombre positif'),
  body('unit')
    .optional()
    .isIn(['pièce', 'kg', 'g', 'litre', 'ml'])
    .withMessage('Unité invalide'),
  body('minStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Le stock minimum doit être un nombre positif'),
  body('maxStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Le stock maximum doit être un nombre positif')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { name, description, category, price, unit, minStock, maxStock, nutritionalInfo, isActive } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Vérifier que la catégorie existe si elle est fournie
    if (category) {
      const Category = require('../models/Category');
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) {
        return res.status(400).json({ message: 'Catégorie non trouvée' });
      }
    }

    // Vérifier que maxStock >= minStock
    const newMinStock = minStock !== undefined ? minStock : product.minStock;
    const newMaxStock = maxStock !== undefined ? maxStock : product.maxStock;

    if (newMaxStock < newMinStock) {
      return res.status(400).json({
        message: 'Le stock maximum doit être supérieur ou égal au stock minimum'
      });
    }

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (price !== undefined) product.price = price;
    if (unit !== undefined) product.unit = unit;
    if (minStock !== undefined) product.minStock = minStock;
    if (maxStock !== undefined) product.maxStock = maxStock;
    if (nutritionalInfo !== undefined) product.nutritionalInfo = nutritionalInfo;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();
    await product.populate([
      { path: 'category', select: 'name color' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.json({
      message: 'Produit mis à jour avec succès',
      product
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Supprimer un produit (désactiver)
// @access  Private (Admin)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    product.isActive = false;
    await product.save();

    res.json({ message: 'Produit désactivé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;