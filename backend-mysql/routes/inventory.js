const express = require('express');
const { body, validationResult } = require('express-validator');
const { Inventory, InventoryItem, Product, Category, User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation des données d'inventaire
const inventoryValidation = [
  body('date')
    .isISO8601()
    .withMessage('Date invalide'),
  body('type')
    .isIn(['ouverture', 'fermeture'])
    .withMessage('Type d\'inventaire invalide (ouverture ou fermeture)'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Au moins un produit est requis'),
  body('items.*.product')
    .isInt({ min: 1 })
    .withMessage('ID de produit invalide'),
  body('items.*.quantity')
    .isInt({ min: 0 })
    .withMessage('La quantité doit être un nombre entier positif'),
  body('items.*.soldQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La quantité vendue doit être un nombre entier positif'),
  body('items.*.notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Les notes ne peuvent pas dépasser 200 caractères')
];

// Récupérer tous les inventaires avec filtres
router.get('/', auth, async (req, res) => {
  try {
    const {
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    const include = [
      {
        model: User,
        as: 'sellerInfo',
        attributes: ['id', 'username', 'firstName', 'lastName']
      },
      {
        model: InventoryItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          include: [{
            model: Category,
            as: 'categoryInfo',
            attributes: ['id', 'name', 'color']
          }]
        }]
      }
    ];

    // Filtres
    if (req.user.role === 'vendeuse') {
      where.seller = req.user.id;
    } else if (userId && req.user.role === 'admin') {
      where.seller = userId;
    }

    if (startDate) {
      where.date = {
        [require('sequelize').Op.gte]: new Date(startDate)
      };
    }

    if (endDate) {
      if (where.date) {
        where.date[require('sequelize').Op.lte] = new Date(endDate);
      } else {
        where.date = {
          [require('sequelize').Op.lte]: new Date(endDate)
        };
      }
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tri
    const validSortFields = ['date', 'createdAt', 'updatedAt'];
    const validSortOrders = ['ASC', 'DESC'];

    const order = validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())
      ? [[sortBy, sortOrder.toUpperCase()]]
      : [['date', 'DESC']];

    const { count, rows: inventories } = await Inventory.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order,
      distinct: true
    });

    // Calculer les totaux pour chaque inventaire
    const inventoriesWithTotals = inventories.map(inventory => {
      const inventoryData = inventory.toJSON();

      let totalQuantity = 0;
      let totalSold = 0;
      let totalRevenue = 0;

      inventoryData.items.forEach(item => {
        totalQuantity += item.quantity;
        totalSold += item.soldQuantity || 0;
        totalRevenue += (item.soldQuantity || 0) * item.product.price;
      });

      return {
        ...inventoryData,
        totals: {
          totalQuantity,
          totalSold,
          totalRevenue,
          remainingQuantity: totalQuantity - totalSold
        }
      };
    });

    res.json({
      inventories: inventoriesWithTotals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des inventaires:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des inventaires',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Récupérer un inventaire par ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await Inventory.findByPk(id, {
      include: [
        {
          model: User,
          as: 'sellerInfo',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: InventoryItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            include: [{
              model: Category,
              as: 'categoryInfo',
              attributes: ['id', 'name', 'color']
            }]
          }]
        }
      ]
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'vendeuse' && inventory.seller !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Calculer les totaux
    const inventoryData = inventory.toJSON();
    let totalQuantity = 0;
    let totalSold = 0;
    let totalRevenue = 0;

    inventoryData.items.forEach(item => {
      totalQuantity += item.quantity;
      totalSold += item.soldQuantity || 0;
      totalRevenue += (item.soldQuantity || 0) * item.product.price;
    });

    const response = {
      ...inventoryData,
      totals: {
        totalQuantity,
        totalSold,
        totalRevenue,
        remainingQuantity: totalQuantity - totalSold
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inventaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération de l\'inventaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Créer un nouvel inventaire
router.post('/', auth, inventoryValidation, async (req, res) => {
  const transaction = await require('../models').sequelize.transaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { date, items } = req.body;
    const userId = req.user.id;

    // Vérifier que tous les produits existent
    const productIds = items.map(item => item.product);
    const products = await Product.findAll({
      where: {
        id: productIds,
        isActive: true
      }
    });

    if (products.length !== productIds.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Un ou plusieurs produits sont invalides ou inactifs' });
    }

    // Créer un map des produits pour accès rapide
    const productMap = new Map(products.map(p => [p.id, p]));

    // Calculer la valeur totale
    let totalValue = 0;
    for (const item of items) {
      const product = productMap.get(item.product);
      if (product) {
        totalValue += item.quantity * parseFloat(product.price);
      }
    }

    // Créer l'inventaire
    const inventory = await Inventory.create({
      date: new Date(date),
      type: req.body.type || 'ouverture',
      seller: userId,
      notes: req.body.notes || '',
      totalValue: totalValue
    }, { transaction });

    // Créer les items
    const inventoryItems = await Promise.all(
      items.map(item =>
        InventoryItem.create({
          inventoryId: inventory.id,
          productId: item.product,
          quantity: item.quantity,
          soldQuantity: item.soldQuantity || 0,
          notes: item.notes
        }, { transaction })
      )
    );

    await transaction.commit();

    // Récupérer l'inventaire créé avec toutes les relations
    const createdInventory = await Inventory.findByPk(inventory.id, {
      include: [
        {
          model: User,
          as: 'sellerInfo',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: InventoryItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            include: [{
              model: Category,
              as: 'categoryInfo',
              attributes: ['id', 'name', 'color']
            }]
          }]
        }
      ]
    });

    res.status(201).json({
      message: 'Inventaire créé avec succès',
      inventory: createdInventory
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la création de l\'inventaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la création de l\'inventaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mettre à jour un inventaire
router.put('/:id', auth, inventoryValidation, async (req, res) => {
  const transaction = await require('../models').sequelize.transaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { date, items } = req.body;

    const inventory = await Inventory.findByPk(id);
    if (!inventory) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'vendeuse' && inventory.seller !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Vérifier que tous les produits existent
    const productIds = items.map(item => item.product);
    const products = await Product.findAll({
      where: {
        id: productIds,
        isActive: true
      }
    });

    if (products.length !== productIds.length) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Un ou plusieurs produits sont invalides ou inactifs' });
    }

    // Calculer la nouvelle valeur totale
    const productMap = new Map(products.map(p => [p.id, p]));
    let totalValue = 0;
    for (const item of items) {
      const product = productMap.get(item.product);
      if (product) {
        totalValue += item.quantity * parseFloat(product.price);
      }
    }

    // Mettre à jour l'inventaire
    await inventory.update({
      date: new Date(date),
      type: req.body.type || inventory.type,
      notes: req.body.notes || inventory.notes,
      totalValue: totalValue
    }, { transaction });

    // Supprimer les anciens items
    await InventoryItem.destroy({
      where: { inventoryId: id },
      transaction
    });

    // Créer les nouveaux items
    await Promise.all(
      items.map(item =>
        InventoryItem.create({
          inventoryId: id,
          productId: item.product,
          quantity: item.quantity,
          soldQuantity: item.soldQuantity || 0,
          notes: item.notes
        }, { transaction })
      )
    );

    await transaction.commit();

    // Récupérer l'inventaire mis à jour
    const updatedInventory = await Inventory.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: InventoryItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            include: [{
              model: Category,
              as: 'categoryInfo',
              attributes: ['id', 'name', 'color']
            }]
          }]
        }
      ]
    });

    res.json({
      message: 'Inventaire mis à jour avec succès',
      inventory: updatedInventory
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la mise à jour de l\'inventaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour de l\'inventaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Supprimer un inventaire
router.delete('/:id', auth, async (req, res) => {
  const transaction = await require('../models').sequelize.transaction();

  try {
    const { id } = req.params;

    const inventory = await Inventory.findByPk(id);
    if (!inventory) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'vendeuse' && inventory.userId !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Supprimer les items en premier (contrainte de clé étrangère)
    await InventoryItem.destroy({
      where: { inventoryId: id },
      transaction
    });

    // Supprimer l'inventaire
    await inventory.destroy({ transaction });

    await transaction.commit();

    res.json({ message: 'Inventaire supprimé avec succès' });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la suppression de l\'inventaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la suppression de l\'inventaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mettre à jour les quantités vendues
router.patch('/:id/sales', auth, async (req, res) => {
  const transaction = await require('../models').sequelize.transaction();

  try {
    const { id } = req.params;
    const { sales } = req.body; // Array de { productId, soldQuantity }

    if (!Array.isArray(sales)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Les données de vente doivent être un tableau' });
    }

    const inventory = await Inventory.findByPk(id);
    if (!inventory) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'vendeuse' && inventory.userId !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Mettre à jour les quantités vendues
    for (const sale of sales) {
      const item = await InventoryItem.findOne({
        where: {
          inventoryId: id,
          productId: sale.productId
        }
      });

      if (item) {
        if (sale.soldQuantity > item.quantity) {
          await transaction.rollback();
          return res.status(400).json({
            message: `Quantité vendue (${sale.soldQuantity}) supérieure à la quantité disponible (${item.quantity}) pour le produit ${sale.productId}`
          });
        }

        await item.update({
          soldQuantity: sale.soldQuantity
        }, { transaction });
      }
    }

    await transaction.commit();

    // Récupérer l'inventaire mis à jour
    const updatedInventory = await Inventory.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: InventoryItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            include: [{
              model: Category,
              as: 'categoryInfo',
              attributes: ['id', 'name', 'color']
            }]
          }]
        }
      ]
    });

    res.json({
      message: 'Ventes mises à jour avec succès',
      inventory: updatedInventory
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la mise à jour des ventes:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour des ventes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Confirmer un inventaire
router.patch('/:id/confirm', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'inventaire existe
    const inventory = await Inventory.findByPk(id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventaire non trouvé' });
    }

    // Vérifier les permissions (admin ou propriétaire)
    if (req.user.role === 'vendeuse' && inventory.seller !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Confirmer l'inventaire
    await inventory.update({ isConfirmed: true });

    // Récupérer l'inventaire mis à jour avec les relations
    const updatedInventory = await Inventory.findByPk(id, {
      include: [
        {
          model: User,
          as: 'sellerInfo',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: InventoryItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            include: [{
              model: Category,
              as: 'categoryInfo',
              attributes: ['id', 'name', 'color']
            }]
          }]
        }
      ]
    });

    res.json({
      message: 'Inventaire confirmé avec succès',
      inventory: updatedInventory
    });

  } catch (error) {
    console.error('Erreur lors de la confirmation de l\'inventaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la confirmation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;