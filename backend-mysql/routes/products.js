const express = require('express');
const { body, validationResult } = require('express-validator');
const { Product, Category, Inventory, InventoryItem, User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation des données produit
const productValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('category')
    .isInt()
    .withMessage('ID de catégorie invalide'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Le prix doit être un nombre positif'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères'),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('L\'unité ne peut pas dépasser 20 caractères'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive doit être un booléen')
];

// Récupérer tous les produits avec filtres
router.get('/', auth, async (req, res) => {
  try {
    const {
      categoryId,
      isActive,
      search,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'ASC'
    } = req.query;

    const where = {};
    const include = [{
      model: Category,
      as: 'categoryInfo',
      attributes: ['id', 'name', 'color']
    }];

    // Filtres
    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.name = {
        [require('sequelize').Op.iLike]: `%${search}%`
      };
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tri
    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt'];
    const validSortOrders = ['ASC', 'DESC'];

    const order = validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())
      ? [[sortBy, sortOrder.toUpperCase()]]
      : [['name', 'ASC']];

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order,
      distinct: true
    });

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des produits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Récupérer un produit par ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'color']
      }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json(product);

  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Créer un nouveau produit (admin seulement)
router.post('/', auth, productValidation, async (req, res) => {
  try {
    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { name, category, price, description, unit, isActive = true } = req.body;

    // Vérifier que la catégorie existe
    const categoryRecord = await Category.findByPk(category);
    if (!categoryRecord) {
      return res.status(400).json({ message: 'Catégorie non trouvée' });
    }

    // Vérifier l'unicité du nom
    const existingProduct = await Product.findOne({ where: { name } });
    if (existingProduct) {
      return res.status(400).json({ message: 'Un produit avec ce nom existe déjà' });
    }

    const product = await Product.create({
      name,
      category,
      price,
      description,
      unit,
      isActive,
      createdBy: req.user.id
    });

    // Récupérer le produit créé avec la catégorie
    const createdProduct = await Product.findByPk(product.id, {
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'color']
      }]
    });

    res.status(201).json({
      message: 'Produit créé avec succès',
      product: createdProduct
    });

  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la création du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mettre à jour un produit (admin seulement)
router.put('/:id', auth, productValidation, async (req, res) => {
  try {
    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, category, price, description, unit, isActive } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Vérifier que la catégorie existe
    const categoryRecord = await Category.findByPk(category);
    if (!categoryRecord) {
      return res.status(400).json({ message: 'Catégorie non trouvée' });
    }

    // Vérifier l'unicité du nom (sauf pour le produit actuel)
    const existingProduct = await Product.findOne({
      where: {
        name,
        id: { [require('sequelize').Op.ne]: id }
      }
    });
    if (existingProduct) {
      return res.status(400).json({ message: 'Un produit avec ce nom existe déjà' });
    }

    await product.update({
      name,
      category,
      price,
      description,
      unit,
      isActive
    });

    // Récupérer le produit mis à jour avec la catégorie
    const updatedProduct = await Product.findByPk(id, {
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'color']
      }]
    });

    res.json({
      message: 'Produit mis à jour avec succès',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Supprimer un produit (admin seulement)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Vérifier s'il y a des inventaires associés
    const inventoryItems = await InventoryItem.findOne({ where: { productId: id } });
    if (inventoryItems) {
      return res.status(400).json({
        message: 'Impossible de supprimer ce produit car il est utilisé dans des inventaires'
      });
    }

    await product.destroy();

    res.json({ message: 'Produit supprimé avec succès' });

  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la suppression du produit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir les produits d'une catégorie
router.get('/category/:categoryId', auth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { isActive = true } = req.query;

    const where = { categoryId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const products = await Product.findAll({
      where,
      include: [{
        model: Category,
        as: 'categoryInfo',
        attributes: ['id', 'name', 'color']
      }],
      order: [['name', 'ASC']]
    });

    res.json(products);

  } catch (error) {
    console.error('Erreur lors de la récupération des produits par catégorie:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des produits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;