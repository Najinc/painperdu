const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Fonction de logging
const logToFile = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  // Écrire dans le fichier de log
  fs.appendFileSync(path.join(__dirname, 'server-error.log'), logMessage);

  // Aussi afficher dans la console
  console.log(logMessage.trim());
};

// Log du démarrage
logToFile('=== DÉMARRAGE DU SERVEUR PAINPERDU ===', 'START');

// Import des modèles et de la base de données
logToFile('Import des modèles de base de données...');
const db = require('./models');

// Import des routes
logToFile('Import des routes API...');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const scheduleRoutes = require('./routes/schedules');
const statisticsRoutes = require('./routes/statistics');

const app = express();

// Log de la configuration
logToFile(`Variables d'environnement:`, 'CONFIG');
logToFile(`- NODE_ENV: ${process.env.NODE_ENV}`, 'CONFIG');
logToFile(`- PORT: ${process.env.PORT || 5000}`, 'CONFIG');
logToFile(`- DB_HOST: ${process.env.DB_HOST || 'non défini'}`, 'CONFIG');
logToFile(`- DB_NAME: ${process.env.DB_NAME || 'non défini'}`, 'CONFIG');
logToFile(`- FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`, 'CONFIG');

// Middlewares de sécurité
logToFile('Configuration des middlewares de sécurité...');
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par windowMs
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});
app.use('/api/', limiter);

// CORS
const corsOrigin = process.env.FRONTEND_URL || 'https://painperdu.lamiecreme.fr';
logToFile(`Configuration CORS pour: ${corsOrigin}`, 'CONFIG');
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Middleware de logging des requêtes
app.use((req, res, next) => {
  logToFile(`${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`, 'REQUEST');
  next();
});

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
  const errorMessage = `Erreur globale: ${error.message} - Stack: ${error.stack}`;
  logToFile(errorMessage, 'ERROR');
  console.error('Erreur globale:', error);

  if (error.name === 'SequelizeValidationError') {
    logToFile(`Erreur de validation Sequelize: ${JSON.stringify(error.errors)}`, 'ERROR');
    return res.status(400).json({
      message: 'Erreur de validation',
      errors: error.errors.map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    logToFile(`Erreur contrainte unicité: ${error.errors[0]?.path}`, 'ERROR');
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
    logToFile('Démarrage du serveur...', 'START');

    // Test de connexion à la base de données
    logToFile('Test de connexion à la base de données...', 'DB');
    await db.sequelize.authenticate();
    logToFile('✅ Connexion à MySQL établie avec succès', 'DB');
    console.log('✅ Connexion à MySQL établie avec succès');

    // Synchronisation des modèles - force la création si les tables n'existent pas
    // mais ne modifie pas les tables existantes pour éviter les conflits SQLite
    logToFile('Synchronisation des modèles...', 'DB');
    await db.sequelize.sync({ force: false });
    logToFile('✅ Modèles synchronisés avec la base de données', 'DB');
    console.log('✅ Modèles synchronisés avec la base de données');

    app.listen(PORT, () => {
      logToFile(`🚀 Serveur démarré sur le port ${PORT}`, 'START');
      logToFile(`📱 API disponible sur http://localhost:${PORT}/api`, 'START');
      logToFile(`🏥 Health check: http://localhost:${PORT}/api/health`, 'START');

      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📱 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    const errorMsg = `❌ Impossible de démarrer le serveur: ${error.message}`;
    logToFile(errorMsg, 'FATAL');
    logToFile(`Stack trace: ${error.stack}`, 'FATAL');

    console.error('❌ Impossible de démarrer le serveur:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;