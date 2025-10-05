# PainPerdu - Application de Gestion de Boulangerie

Une application web complète pour la gestion d'une boulangerie, développée avec React, Node.js, MongoDB et Docker.

## 🥖 Fonctionnalités

### Pour les Administrateurs
- **Dashboard** : Vue d'ensemble des ventes, stock et plannings
- **Gestion des catégories** : Créer et organiser les catégories de produits
- **Gestion des produits** : Ajouter, modifier et gérer les produits
- **Gestion des vendeurs** : Créer et gérer les comptes vendeurs
- **Plannings** : Définir les horaires de travail des vendeurs
- **Statistiques** : Analyses des ventes, gaspillage et performances

### Pour les Vendeuses
- **Inventaire** : Saisie des stocks d'ouverture et de fermeture
- **Planning personnel** : Consultation des horaires de travail
- **Dashboard** : Vue simplifiée des tâches quotidiennes

## 🛠️ Technologies Utilisées

- **Frontend** : React 18, Vite, Tailwind CSS, DaisyUI
- **Backend** : Node.js, Express.js, MongoDB avec Mongoose
- **Authentification** : JWT (JSON Web Tokens)
- **Containerisation** : Docker & Docker Compose
- **Base de données** : MongoDB

## 🚀 Installation et Démarrage

### Prérequis
- Docker Desktop installé
- Git

### 1. Cloner le projet
```bash
git clone <url-du-repo>
cd PainPerdu
```

### 2. Configuration
Copiez le fichier d'environnement :
```bash
cp .env.example .env
```

### 3. Démarrage avec Docker
```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

### 4. Accès à l'application
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5000
- **MongoDB** : localhost:27017

## 👤 Comptes de Test

### Administrateur
- **Email** : admin@painperdu.com
- **Mot de passe** : password

### Vendeuse (exemple)
- **Email** : vendeuse@painperdu.com
- **Mot de passe** : password

## 📁 Structure du Projet

```
PainPerdu/
├── docker-compose.yml
├── frontend/                 # Application React
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/      # Composants réutilisables
│   │   ├── contexts/        # Context API (Auth)
│   │   ├── pages/          # Pages de l'application
│   │   └── ...
│   ├── package.json
│   └── ...
├── backend/                 # API Node.js
│   ├── Dockerfile
│   ├── models/             # Modèles MongoDB
│   ├── routes/             # Routes API
│   ├── middleware/         # Middlewares (auth, etc.)
│   ├── server.js
│   ├── package.json
│   └── ...
├── mongo-init/             # Scripts d'initialisation MongoDB
└── README.md
```

## 🔧 Développement

### Démarrage en mode développement
```bash
# Démarrer seulement la base de données
docker-compose up -d mongodb

# Démarrer le backend en local
cd backend
npm install
npm run dev

# Démarrer le frontend en local (nouveau terminal)
cd frontend
npm install
npm run dev
```

### Commandes utiles

```bash
# Voir les logs d'un service spécifique
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f mongodb

# Redémarrer un service
docker-compose restart backend

# Entrer dans un conteneur
docker-compose exec backend sh
docker-compose exec mongodb mongosh

# Reconstruire les images
docker-compose build --no-cache
```

## 📊 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription (admin seulement)
- `GET /api/auth/me` - Profil utilisateur
- `PUT /api/auth/profile` - Mise à jour profil

### Catégories
- `GET /api/categories` - Liste des catégories
- `POST /api/categories` - Créer une catégorie
- `PUT /api/categories/:id` - Modifier une catégorie
- `DELETE /api/categories/:id` - Supprimer une catégorie

### Produits
- `GET /api/products` - Liste des produits
- `POST /api/products` - Créer un produit
- `PUT /api/products/:id` - Modifier un produit
- `DELETE /api/products/:id` - Supprimer un produit

### Plannings
- `GET /api/schedules` - Liste des plannings
- `POST /api/schedules` - Créer un planning
- `PUT /api/schedules/:id` - Modifier un planning
- `DELETE /api/schedules/:id` - Supprimer un planning

### Inventaires
- `GET /api/inventory` - Liste des inventaires
- `POST /api/inventory` - Créer un inventaire
- `PUT /api/inventory/:id` - Modifier un inventaire
- `GET /api/inventory/stock/current` - Stock actuel

### Statistiques
- `GET /api/statistics/dashboard` - Stats du dashboard
- `GET /api/statistics/sales` - Stats des ventes
- `GET /api/statistics/products` - Stats par produit

## 🔒 Sécurité

- Authentification JWT
- Hashage des mots de passe avec bcrypt
- Validation des données d'entrée
- Protection CORS
- Rate limiting
- Helmet.js pour les headers de sécurité

## 🐛 Dépannage

### Problèmes communs

1. **Port déjà utilisé**
   ```bash
   # Changer les ports dans docker-compose.yml
   ports:
     - "3001:3000"  # Au lieu de 3000:3000
   ```

2. **Base de données non accessible**
   ```bash
   # Vérifier que MongoDB est démarré
   docker-compose ps
   docker-compose logs mongodb
   ```

3. **Erreurs de permissions**
   ```bash
   # Sur Linux/Mac
   sudo chown -R $USER:$USER .
   ```

## 📝 Todo / Améliorations

- [ ] Tests unitaires et d'intégration
- [ ] Gestion des images produits
- [ ] Notifications push
- [ ] Export des données (PDF, Excel)
- [ ] Multi-langues
- [ ] Mode hors ligne
- [ ] Sauvegarde automatique

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/ma-feature`)
3. Commit vos changements (`git commit -am 'Ajout de ma feature'`)
4. Push vers la branche (`git push origin feature/ma-feature`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Email : support@painperdu.com

---

Fait avec ❤️ pour les boulangers