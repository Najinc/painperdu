const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Modèle User simplifié
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'vendeuse'], default: 'vendeuse' },
  firstName: String,
  lastName: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Méthode pour hacher le mot de passe
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/painperdu?authSource=admin');
    console.log('Connecté à MongoDB');

    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ email: 'admin@painperdu.com' });
    if (existingAdmin) {
      console.log('Utilisateur admin existe déjà');
      return;
    }

    // Créer l'utilisateur admin
    const adminUser = new User({
      username: 'admin',
      email: 'admin@painperdu.com',
      password: 'password', // Sera hashé automatiquement
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Système',
      isActive: true
    });

    await adminUser.save();
    console.log('Utilisateur admin créé avec succès!');
    console.log('Email: admin@painperdu.com');
    console.log('Mot de passe: password');

  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminUser();