const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware d'authentification JWT
 * Vérifie la validité du token et charge les données utilisateur
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express  
 * @param {Function} next - Fonction suivante
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_jwt_secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token invalide. Utilisateur non trouvé.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Compte désactivé.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(401).json({ message: 'Token invalide.' });
  }
};

/**
 * Middleware d'autorisation basé sur les rôles
 * @param {...string} roles - Rôles autorisés
 * @returns {Function} Middleware d'autorisation
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Accès refusé. Permissions insuffisantes.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware pour autoriser l'accès aux propriétaires des ressources ou aux admins
 * Les admins peuvent accéder à tout, les vendeurs uniquement à leurs données
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction suivante
 */
const authorizeOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié.' });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params.id || req.params.sellerId || req.body.seller;

    if (resourceId && resourceId !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Accès refusé. Vous ne pouvez accéder qu\'à vos propres données.'
      });
    }

    next();
  } catch (error) {
    console.error('Erreur d\'autorisation:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
};

module.exports = {
  auth,
  authorize,
  authorizeOwnerOrAdmin
};