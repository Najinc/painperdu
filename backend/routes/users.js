const express = require('express');
const { bodyrouter.get('/sellers', auth, async (req, res) => {
  lidationResurouter.get('/:id', auth, authorize('admin'), async (req, res) => { = require('express-validator');
    const User = require('../models/User');
    const { auth, authorize } = require('../middleware/auth');

    const router = express.Router();

    // @route   GET /api/users
    // @desc    Obtenir tous les utilisateurs (admin seulement)
    // @access  Private (Admin)
    router.get('/', [auth, authorize('admin')], async (req, res) => {
      try {
        const { role, search, page = 1, limit = 10 } = req.query;

        let query = {};

        if (role) {
          query.role = role;
        }

        if (search) {
          query.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } }
          ];
        }

        const users = await User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
          users,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
      }
    });

    // @route   GET /api/users/sellers
    // @desc    Obtenir toutes les vendeuses
    // @access  Private
    router.get('/sellers', auth, async (req, res) => {
      try {
        const sellers = await User.find({ role: 'vendeuse', isActive: true })
          .select('-password')
          .sort({ firstName: 1, lastName: 1 });

        res.json(sellers);
      } catch (error) {
        console.error('Erreur lors de la récupération des vendeuses:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
      }
    });

    // @route   GET /api/users/:id
    // @desc    Obtenir un utilisateur par ID
    // @access  Private (Admin)
    router.get('/:id', [auth, authorize('admin')], async (req, res) => {
      try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.json(user);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
      }
    });

    // @route   PUT /api/users/:id
    // @desc    Mettre à jour un utilisateur (admin seulement)
    // @access  Private (Admin)
    router.put('/:id', [
      auth,
      authorize('admin'),
      body('firstName').optional().isLength({ max: 50 }),
      body('lastName').optional().isLength({ max: 50 }),
      body('email').optional().isEmail().normalizeEmail(),
      body('role').optional().isIn(['admin', 'vendeuse'])
    ], async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { firstName, lastName, email, role, isActive } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier si l'email est déjà utilisé
        if (email && email !== user.email) {
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
          }
        }

        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        res.json({
          message: 'Utilisateur mis à jour avec succès',
          user
        });
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
      }
    });

    // @route   DELETE /api/users/:id
    // @desc    Supprimer un utilisateur (désactiver)
    // @access  Private (Admin)
    router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
      try {
        const user = await User.findById(req.params.id);

        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Empêcher la suppression de son propre compte
        if (user._id.toString() === req.user._id.toString()) {
          return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
        }

        user.isActive = false;
        await user.save();

        res.json({ message: 'Utilisateur désactivé avec succès' });
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
      }
    });

    module.exports = router;