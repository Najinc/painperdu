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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Seuls les administrateurs peuvent créer des comptes' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { username, email, password, role, firstName, lastName } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ?
          'Cet email est déjà utilisé' :
          'Ce nom d\'utilisateur est déjà pris'
      });
    }

    const user = new User({
      username,
      email,
      password,
      role,
      firstName,
      lastName
    });

    await user.save();

    const token = generateToken(user._id);
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
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

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field === 'email' ? 'Email' : 'Nom d\'utilisateur'} déjà utilisé`
      });
    }

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
        message: 'Données de connexion invalides',
        errors: errors.array()
      });
    }

    const { login, password } = req.body;

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

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const token = generateToken(user._id);
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Connexion réussie',
      token,
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
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

/**
 * Récupération des informations utilisateur connecté
 */
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      isActive: req.user.isActive,
      lastLogin: req.user.lastLogin
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

/**
 * Mise à jour du profil utilisateur
 */
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
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email } = req.body;
    const updates = {};

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user._id }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      updates.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

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

    if (error.code === 11000) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

/**
 * Changement de mot de passe
 */
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
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Mot de passe changé avec succès' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;