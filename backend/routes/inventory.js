const express = require('express');
const { body, validationResult } = require('express-validator');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { auth, authorize, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { startOfDay, endOfDay } = require('date-fns');

const router = express.Router();

// @route   GET /api/inventory/all
// @desc    Obtenir tous les inventaires (admin seulement)
// @access  Private - Admin only
router.get('/all', auth, async (req, res) => {
  // Vérifier que l'utilisateur est admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé - Administrateur requis' });
  }
  try {
    const { page = 1, limit = 100 } = req.query;

    const inventories = await Inventory.find()
      .populate('seller', 'username email firstName lastName')
      .populate('items.product', 'name price category')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json(inventories);
  } catch (error) {
    console.error('Erreur lors de la récupération des inventaires:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   GET /api/inventory/history
// @desc    Obtenir l'historique des inventaires
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { seller, limit = 10 } = req.query;

    let query = {};

    // Si c'est une vendeuse, elle ne peut voir que ses inventaires
    if (req.user.role === 'vendeuse' || req.user.role === 'vendeur') {
      query.seller = req.user._id;
    } else if (seller) {
      query.seller = seller;
    }

    const inventories = await Inventory.find(query)
      .populate('seller', 'username email firstName lastName')
      .populate('items.product', 'name price')
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json(inventories);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   GET /api/inventory
// @desc    Obtenir les inventaires
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { seller, type, date, page = 1, limit = 20 } = req.query;

    let query = {};

    // Si c'est une vendeuse, elle ne peut voir que ses inventaires
    if (req.user.role === 'vendeuse' || req.user.role === 'vendeur') {
      query.seller = req.user._id;
    } else if (seller) {
      query.seller = seller;
    }

    if (type) {
      query.type = type;
    }

    if (date) {
      const targetDate = new Date(date);
      query.date = {
        $gte: startOfDay(targetDate),
        $lte: endOfDay(targetDate)
      };
    }

    const inventories = await Inventory.find(query)
      .populate('seller', 'username firstName lastName')
      .populate('items.product', 'name price unit category')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Inventory.countDocuments(query);

    res.json({
      inventories,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des inventaires:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/inventory/today
// @desc    Obtenir les inventaires du jour pour la vendeuse connectée
// @access  Private (Vendeuse)
router.get('/today', [auth, authorize('vendeuse')], async (req, res) => {
  try {
    const today = new Date();

    const inventories = await Inventory.find({
      seller: req.user._id,
      date: {
        $gte: startOfDay(today),
        $lte: endOfDay(today)
      }
    })
      .populate('items.product', 'name price unit category')
      .sort({ type: 1 }); // ouverture avant fermeture

    res.json(inventories);
  } catch (error) {
    console.error('Erreur lors de la récupération des inventaires du jour:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/inventory/:id
// @desc    Obtenir un inventaire par ID
// @access  Private
router.get('/:id', [auth, authorizeOwnerOrAdmin], async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id)
      .populate('seller', 'username firstName lastName')
      .populate('items.product', 'name price unit category');

    if (!inventory) {
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    res.json(inventory);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inventaire:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   POST /api/inventory
// @desc    Créer un nouvel inventaire
// @access  Private (Vendeuse et Admin)
router.post('/', [
  auth,
  body('type')
    .isIn(['ouverture', 'fermeture'])
    .withMessage('Le type doit être ouverture ou fermeture'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Au moins un article est requis'),
  body('items.*.product')
    .isMongoId()
    .withMessage('ID de produit invalide'),
  body('items.*.quantity')
    .isFloat({ min: 0 })
    .withMessage('La quantité doit être un nombre positif'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { type, items, notes, date } = req.body;
    const inventoryDate = date ? new Date(date) : new Date();

    // Vérifier qu'il n'y a pas déjà un inventaire du même type pour la même date
    const existingInventory = await Inventory.findOne({
      seller: req.user._id,
      type,
      date: {
        $gte: startOfDay(inventoryDate),
        $lte: endOfDay(inventoryDate)
      }
    });

    if (existingInventory) {
      return res.status(400).json({
        message: `Un inventaire de ${type} existe déjà pour cette date`
      });
    }

    // Vérifier que tous les produits existent
    const productIds = items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: 'Un ou plusieurs produits sont invalides ou inactifs' });
    }

    const inventory = new Inventory({
      type,
      seller: req.user._id,
      items,
      notes,
      date: inventoryDate
    });

    await inventory.save();
    await inventory.populate([
      { path: 'seller', select: 'username firstName lastName' },
      { path: 'items.product', select: 'name price unit category' }
    ]);

    res.status(201).json({
      message: 'Inventaire créé avec succès',
      inventory
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'inventaire:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Mettre à jour un inventaire
// @access  Private (Propriétaire ou Admin)
router.put('/:id', [
  auth,
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Au moins un article est requis'),
  body('items.*.product')
    .optional()
    .isMongoId()
    .withMessage('ID de produit invalide'),
  body('items.*.quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La quantité doit être un nombre positif'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && inventory.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Empêcher la modification des inventaires confirmés (sauf admin)
    if (inventory.isConfirmed && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Impossible de modifier un inventaire confirmé' });
    }

    const { items, notes, isConfirmed } = req.body;

    if (items) {
      // Vérifier que tous les produits existent
      const productIds = items.map(item => item.product);
      const products = await Product.find({ _id: { $in: productIds }, isActive: true });

      if (products.length !== productIds.length) {
        return res.status(400).json({ message: 'Un ou plusieurs produits sont invalides ou inactifs' });
      }

      inventory.items = items;
    }

    if (notes !== undefined) inventory.notes = notes;
    if (isConfirmed !== undefined && req.user.role === 'admin') {
      inventory.isConfirmed = isConfirmed;
    }

    await inventory.save();
    await inventory.populate([
      { path: 'seller', select: 'username firstName lastName' },
      { path: 'items.product', select: 'name price unit category' }
    ]);

    res.json({
      message: 'Inventaire mis à jour avec succès',
      inventory
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'inventaire:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   PATCH /api/inventory/:id/confirm
// @desc    Confirmer un inventaire
// @access  Private (Propriétaire ou Admin)
router.patch('/:id/confirm', auth, async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && inventory.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Empêcher de confirmer un inventaire déjà confirmé
    if (inventory.isConfirmed) {
      return res.status(400).json({ message: 'Inventaire déjà confirmé' });
    }

    inventory.isConfirmed = true;
    inventory.confirmedAt = new Date();

    await inventory.save();
    await inventory.populate([
      { path: 'seller', select: 'username firstName lastName' },
      { path: 'items.product', select: 'name price unit category' }
    ]);

    res.json({
      message: 'Inventaire confirmé avec succès',
      inventory
    });
  } catch (error) {
    console.error('Erreur lors de la confirmation de l\'inventaire:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   DELETE /api/inventory/:id
// @desc    Supprimer un inventaire
// @access  Private (Propriétaire ou Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && inventory.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Empêcher la suppression des inventaires confirmés (sauf admin)
    if (inventory.isConfirmed && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Impossible de supprimer un inventaire confirmé' });
    }

    await Inventory.deleteOne({ _id: req.params.id });

    res.json({ message: 'Inventaire supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'inventaire:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/inventory/stock/current
// @desc    Obtenir le stock actuel (basé sur le dernier inventaire de fermeture)
// @access  Private
router.get('/stock/current', auth, async (req, res) => {
  try {
    // Obtenir le dernier inventaire de fermeture confirmé
    const lastInventory = await Inventory.findOne({
      type: 'fermeture',
      isConfirmed: true
    })
      .populate('items.product', 'name price unit category')
      .sort({ date: -1 });

    if (!lastInventory) {
      return res.json({
        message: 'Aucun inventaire de fermeture trouvé',
        stock: [],
        lastUpdate: null
      });
    }

    const stock = lastInventory.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      value: item.quantity * item.product.price
    }));

    const totalValue = stock.reduce((sum, item) => sum + item.value, 0);

    res.json({
      stock,
      totalValue,
      lastUpdate: lastInventory.date,
      updatedBy: lastInventory.seller
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du stock actuel:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;