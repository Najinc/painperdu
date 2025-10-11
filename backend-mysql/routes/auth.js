const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Inscription d'un nouvel utilisateur
// @access  Public (mais sera limité aux admins en production)
router.post('/register', [
  body('username')
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
  body('role')
    .optional()
    .isIn(['admin', 'vendeuse'])
    .withMessage('Rôle invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { username, email, password, role = 'vendeuse', firstName, lastName } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
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

    // Créer le nouvel utilisateur
    const user = await User.create({
      username,
      email,
      password,
      role,
      firstName,
      lastName
    });

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   POST /api/auth/login
// @desc    Connexion d'un utilisateur
// @access  Public
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

    // Chercher l'utilisateur par email ou username
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: login },
          { username: login }
        ]
      }
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

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/auth/me
// @desc    Obtenir les informations de l'utilisateur connecté
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   POST /api/auth/refresh
// @desc    Renouveler le token JWT
// @access  Private
router.post('/refresh', auth, async (req, res) => {
  try {
    const token = jwt.sign(
      { id: req.user.id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json({
      message: 'Token renouvelé avec succès',
      token
    });
  } catch (error) {
    console.error('Erreur lors du renouvellement du token:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;