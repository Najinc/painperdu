const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const scheduleRoutes = require('./routes/schedules');
const inventoryRoutes = require('./routes/inventory');
const statisticsRoutes = require('./routes/statistics');

const app = express();

// Middleware de sécurité
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par windowMs
});
app.use(limiter);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Request-Id']
}));

// Ajouter des headers CORS explicites pour toutes les requêtes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/painperdu', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connexion à MongoDB réussie'))
  .catch((error) => console.error('Erreur de connexion à MongoDB:', error));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/statistics', statisticsRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({
    message: 'API PainPerdu fonctionne correctement!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Middleware de gestion d'erreurs globales
app.use((error, req, res, next) => {
  console.error('Erreur:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Erreur de validation',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Token invalide' });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expiré' });
  }

  res.status(error.status || 500).json({
    message: error.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
});