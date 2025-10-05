// Script d'initialisation MongoDB
use('painperdu');

// Créer un utilisateur admin par défaut
db.users.insertOne({
  username: "admin",
  email: "admin@painperdu.com",
  password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date()
});

// Créer quelques catégories par défaut
db.categories.insertMany([
  {
    name: "Viennoiseries",
    description: "Croissants, pains au chocolat, etc.",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Pains",
    description: "Baguettes, pains de campagne, etc.",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Pâtisseries",
    description: "Gâteaux, tartes, éclairs, etc.",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("Base de données PainPerdu initialisée avec succès!");