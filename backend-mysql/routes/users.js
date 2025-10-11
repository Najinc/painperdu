const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { User, Inventory, InventoryItem, Product } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation des données utilisateur
const userValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Le nom d\'utilisateur est requis')
    .isLength({ min: 3, max: 50 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le prénom ne peut pas dépasser 50 caractères'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('role')
    .optional()
    .isIn(['admin', 'vendeuse'])
    .withMessage('Rôle invalide'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive doit être un booléen')
];

// Validation pour la mise à jour (mot de passe optionnel)
const userUpdateValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Le nom d\'utilisateur est requis')
    .isLength({ min: 3, max: 50 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le prénom ne peut pas dépasser 50 caractères'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('role')
    .optional()
    .isIn(['admin', 'vendeuse'])
    .withMessage('Rôle invalide'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive doit être un booléen')
];

// Récupérer tous les utilisateurs (admin seulement)
router.get('/', auth, async (req, res) => {
  try {
    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 20,
      sortBy = 'username',
      sortOrder = 'ASC'
    } = req.query;

    const where = {};

    // Filtres
    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where[require('sequelize').Op.or] = [
        { username: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { email: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { firstName: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { lastName: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ];
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tri
    const validSortFields = ['username', 'email', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'];
    const validSortOrders = ['ASC', 'DESC'];

    const order = validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())
      ? [[sortBy, sortOrder.toUpperCase()]]
      : [['username', 'ASC']];

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] }, // Exclure le mot de passe
      limit: parseInt(limit),
      offset,
      order
    });

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir les vendeurs actifs (pour les sélecteurs)
router.get('/sellers/active', auth, async (req, res) => {
  try {
    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const sellers = await User.findAll({
      where: {
        role: 'vendeuse',
        isActive: true
      },
      attributes: ['id', 'username', 'firstName', 'lastName'],
      order: [['username', 'ASC']]
    });

    res.json(sellers);

  } catch (error) {
    console.error('Erreur lors de la récupération des vendeurs:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des vendeurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Récupérer un utilisateur par ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier les permissions (admin ou utilisateur lui-même)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user);

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Créer un nouvel utilisateur (admin seulement)
router.post('/', auth, userValidation, async (req, res) => {
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

    const { username, email, password, firstName, lastName, role = 'vendeuse', isActive = true } = req.body;

    // Vérifier l'unicité de l'email et du nom d'utilisateur
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà'
      });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      isActive
    });

    // Retourner l'utilisateur sans le mot de passe
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la création de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mettre à jour un utilisateur
router.put('/:id', auth, userUpdateValidation, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier les permissions (admin ou utilisateur lui-même)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { username, email, password, firstName, lastName, role, isActive } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Seul un admin peut modifier le rôle et isActive
    if (req.user.role !== 'admin' && (role !== undefined || isActive !== undefined)) {
      return res.status(403).json({ message: 'Vous ne pouvez pas modifier le rôle ou le statut' });
    }

    // Vérifier l'unicité de l'email et du nom d'utilisateur (sauf pour l'utilisateur actuel)
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.and]: [
          {
            [require('sequelize').Op.or]: [
              { email },
              { username }
            ]
          },
          { id: { [require('sequelize').Op.ne]: id } }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà'
      });
    }

    // Préparer les données de mise à jour
    const updateData = {
      username,
      email,
      firstName,
      lastName
    };

    // Hacher le nouveau mot de passe si fourni
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Ajouter le rôle et isActive si admin
    if (req.user.role === 'admin') {
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    await user.update(updateData);

    // Retourner l'utilisateur mis à jour sans le mot de passe
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: 'Utilisateur mis à jour avec succès',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Supprimer un utilisateur (admin seulement)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression de son propre compte
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Vérifier s'il y a des inventaires associés
    const inventoryCount = await Inventory.count({ where: { userId: id } });
    if (inventoryCount > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer cet utilisateur car il a ${inventoryCount} inventaire(s) associé(s)`
      });
    }

    await user.destroy();

    res.json({ message: 'Utilisateur supprimé avec succès' });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la suppression de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir les statistiques d'un utilisateur
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Vérifier les permissions (admin ou utilisateur lui-même)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const whereClause = { userId: id };

    if (startDate) {
      whereClause.date = {
        [require('sequelize').Op.gte]: new Date(startDate)
      };
    }

    if (endDate) {
      if (whereClause.date) {
        whereClause.date[require('sequelize').Op.lte] = new Date(endDate);
      } else {
        whereClause.date = {
          [require('sequelize').Op.lte]: new Date(endDate)
        };
      }
    }

    // Récupérer les inventaires avec les items
    const inventories = await Inventory.findAll({
      where: whereClause,
      include: [{
        model: InventoryItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    // Calculer les statistiques
    let totalInventories = inventories.length;
    let totalQuantityPrepared = 0;
    let totalQuantitySold = 0;
    let totalRevenue = 0;
    let productStats = {};

    inventories.forEach(inventory => {
      inventory.items.forEach(item => {
        totalQuantityPrepared += item.quantity;
        totalQuantitySold += item.soldQuantity || 0;
        totalRevenue += (item.soldQuantity || 0) * item.product.price;

        // Statistiques par produit
        const productName = item.product.name;
        if (!productStats[productName]) {
          productStats[productName] = {
            totalPrepared: 0,
            totalSold: 0,
            revenue: 0
          };
        }
        productStats[productName].totalPrepared += item.quantity;
        productStats[productName].totalSold += item.soldQuantity || 0;
        productStats[productName].revenue += (item.soldQuantity || 0) * item.product.price;
      });
    });

    const stats = {
      user,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      summary: {
        totalInventories,
        totalQuantityPrepared,
        totalQuantitySold,
        totalRevenue,
        averageSalesRate: totalQuantityPrepared > 0 ? (totalQuantitySold / totalQuantityPrepared) * 100 : 0
      },
      productStats: Object.entries(productStats).map(([productName, stats]) => ({
        productName,
        ...stats,
        salesRate: stats.totalPrepared > 0 ? (stats.totalSold / stats.totalPrepared) * 100 : 0
      })).sort((a, b) => b.revenue - a.revenue)
    };

    res.json(stats);

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;