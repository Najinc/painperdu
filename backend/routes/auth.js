const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * Génère un token JWT pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {string} Token JWT
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'votre_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Enregistrement d'un nouvel utilisateur (admin seulement)
 */
router.post('/register', [
  auth,
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Le nom d\'utilisateur doit faire entre 3 et 30 caractères')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit faire au moins 6 caractères'),
  body('role')
    .isIn(['admin', 'vendeuse'])
    .withMessage('Le rôle doit être admin ou vendeuse'),
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Le prénom ne peut pas dépasser 50 caractères'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères')
], async (req, res) => {
  try {
    // Vérifier que l'utilisateur connecté est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Seuls les administrateurs peuvent créer des comptes' });
    }

    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { username, email, password, role, firstName, lastName } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà'
      });
    }

    // Créer le nouvel utilisateur
    const user = new User({
      username,
      email,
      password,
      role,
      firstName,
      lastName
    });

    await user.save();

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

/**
 * Authentification utilisateur
 */
router.post('/login', [
  body('login')
    .notEmpty()
    .withMessage('Nom d\'utilisateur ou email requis'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { login, password } = req.body;

    // Chercher l'utilisateur par email ou nom d'utilisateur
    const user = await User.findOne({
      $or: [
        { email: login.toLowerCase() },
        { username: login }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Compte désactivé' });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/auth/me
// @desc    Obtenir les infos de l'utilisateur connecté
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

router.put('/profile', [
  auth,
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Le prénom ne peut pas dépasser 50 caractères'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email } = req.body;
    const user = req.user;

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    // Mettre à jour les champs
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;

    await user.save();

    res.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

router.put('/change-password', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit faire au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Vérifier le mot de passe actuel
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Mot de passe modifié avec succès' });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;