const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import des modèles et de la base de données
const db = require('./models');

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const scheduleRoutes = require('./routes/schedules');
const statisticsRoutes = require('./routes/statistics');

const app = express();

// Middlewares de sécurité
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par windowMs
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/statistics', statisticsRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Serveur PainPerdu MySQL fonctionnel',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Middleware de gestion d'erreurs globales
app.use((error, req, res, next) => {
  console.error('Erreur globale:', error);

  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Erreur de validation',
      errors: error.errors.map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Violation de contrainte d\'unicité',
      field: error.errors[0]?.path
    });
  }

  res.status(500).json({
    message: 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

const PORT = process.env.PORT || 5000;

// Synchronisation de la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Test de connexion à la base de données
    await db.sequelize.authenticate();
    console.log('✅ Connexion à MySQL établie avec succès');

    // Synchronisation des modèles - force la création si les tables n'existent pas
    // mais ne modifie pas les tables existantes pour éviter les conflits SQLite
    await db.sequelize.sync({ force: false });
    console.log('✅ Modèles synchronisés avec la base de données');

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📱 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    console.error('❌ Impossible de démarrer le serveur:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;