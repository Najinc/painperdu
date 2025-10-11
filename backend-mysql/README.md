# PainPerdu - Version MySQL

Application de gestion pour la vente de pain perdu, version MySQL compatible avec l'hébergement cPanel.

## 🚀 Caractéristiques

- **Backend**: Node.js + Express + Sequelize + MySQL
- **Frontend**: React + Vite + TailwindCSS
- **Base de données**: MySQL
- **Authentification**: JWT
- **Hébergement**: Compatible cPanel

## 📋 Prérequis

- Node.js 16+
- MySQL 5.7+ ou 8.0+
- npm ou yarn

## 🛠️ Installation

### 1. Configuration de la base de données

Créez une base de données MySQL et notez les informations de connexion.

### 2. Installation des dépendances

```bash
cd backend-mysql
npm install
```

### 3. Configuration de l'environnement

Copiez le fichier `.env.example` vers `.env` et configurez vos variables :

```bash
cp .env.example .env
```

Éditez le fichier `.env` :

```env
NODE_ENV=production
PORT=3001

# Base de données MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=painperdu_db
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe

# JWT Secret (générez une chaîne aléatoire sécurisée)
JWT_SECRET=votre_secret_jwt_tres_securise

# CORS (pour production, mettez l'URL de votre frontend)
CORS_ORIGIN=https://votre-domaine.com
```

### 4. Initialisation de la base de données

```bash
# Créer les tables
npm run init-db

# Créer un administrateur
npm run create-admin

# Optionnel: Créer des données d'exemple
npm run sample-data
```

### 5. Démarrage

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## 📁 Structure du projet

```
backend-mysql/
├── config/
│   └── database.js          # Configuration Sequelize
├── middleware/
│   └── auth.js              # Middleware d'authentification
├── models/
│   ├── index.js             # Point d'entrée des modèles
│   ├── User.js              # Modèle utilisateur
│   ├── Category.js          # Modèle catégorie
│   ├── Product.js           # Modèle produit
│   ├── Inventory.js         # Modèle inventaire
│   ├── InventoryItem.js     # Modèle item d'inventaire
│   └── Schedule.js          # Modèle horaires
├── routes/
│   ├── auth.js              # Routes d'authentification
│   ├── users.js             # Routes utilisateurs
│   ├── categories.js        # Routes catégories
│   ├── products.js          # Routes produits
│   ├── inventory.js         # Routes inventaires
│   ├── schedules.js         # Routes horaires
│   └── statistics.js        # Routes statistiques
├── scripts/
│   ├── init-database.js     # Initialisation DB
│   ├── create-admin.js      # Création admin
│   └── create-sample-data.js # Données d'exemple
├── .env.example             # Template environnement
├── package.json
└── server.js                # Point d'entrée
```

## 🔧 Scripts disponibles

```bash
# Démarrage
npm start                    # Production
npm run dev                  # Développement avec nodemon

# Base de données
npm run init-db              # Initialiser les tables
npm run create-admin         # Créer un administrateur
npm run sample-data          # Créer des données d'exemple

# Déploiement cPanel
npm run setup-cpanel         # Configuration interactive cPanel
npm run deploy-cpanel        # Déploiement automatique
```

## 🌐 Déploiement sur cPanel

### Méthode automatique

```bash
npm run setup-cpanel
npm run deploy-cpanel
```

### Méthode manuelle

1. **Upload des fichiers**
   - Téléchargez tous les fichiers du dossier `backend-mysql/` vers `public_html/api/`
   - Téléchargez le frontend compilé vers `public_html/`

2. **Configuration de la base de données**
   - Créez une base de données MySQL via cPanel
   - Créez un utilisateur et assignez-le à la base
   - Notez les informations de connexion

3. **Configuration Node.js**
   - Dans cPanel, allez dans "Setup Node.js App"
   - Créez une nouvelle application Node.js
   - Définissez le dossier d'application comme `/public_html/api`
   - Définissez le fichier de démarrage comme `server.js`
   - Activez l'application

4. **Variables d'environnement**
   - Ajoutez vos variables d'environnement via l'interface cPanel
   - Ou créez un fichier `.env` dans `/public_html/api/`

5. **Installation des dépendances**
   ```bash
   cd /home/votre_username/public_html/api
   npm install --production
   ```

6. **Initialisation**
   ```bash
   npm run init-db
   npm run create-admin
   ```

## 🔐 Sécurité

- Tous les mots de passe sont hachés avec bcrypt
- Protection CORS configurée
- Rate limiting sur les routes sensibles
- Validation des données d'entrée
- Middleware d'authentification JWT

## 👥 Rôles utilisateurs

### Administrateur
- Gestion complète des utilisateurs
- Gestion des catégories et produits
- Accès à toutes les statistiques
- Gestion des horaires de tous les vendeurs

### Vendeuse
- Gestion de ses propres inventaires
- Consultation de ses horaires
- Saisie des ventes
- Statistiques personnelles

## 📊 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Profil utilisateur

### Utilisateurs (Admin)
- `GET /api/users` - Liste des utilisateurs
- `POST /api/users` - Créer un utilisateur
- `PUT /api/users/:id` - Modifier un utilisateur
- `DELETE /api/users/:id` - Supprimer un utilisateur

### Catégories
- `GET /api/categories` - Liste des catégories
- `POST /api/categories` - Créer une catégorie (Admin)
- `PUT /api/categories/:id` - Modifier une catégorie (Admin)
- `DELETE /api/categories/:id` - Supprimer une catégorie (Admin)

### Produits
- `GET /api/products` - Liste des produits
- `POST /api/products` - Créer un produit (Admin)
- `PUT /api/products/:id` - Modifier un produit (Admin)
- `DELETE /api/products/:id` - Supprimer un produit (Admin)

### Inventaires
- `GET /api/inventory` - Liste des inventaires
- `POST /api/inventory` - Créer un inventaire
- `PUT /api/inventory/:id` - Modifier un inventaire
- `DELETE /api/inventory/:id` - Supprimer un inventaire
- `PATCH /api/inventory/:id/sales` - Mettre à jour les ventes

### Horaires
- `GET /api/schedules` - Liste des horaires
- `POST /api/schedules` - Créer un horaire
- `PUT /api/schedules/:id` - Modifier un horaire
- `DELETE /api/schedules/:id` - Supprimer un horaire
- `GET /api/schedules/week/:date` - Horaires d'une semaine

### Statistiques
- `GET /api/statistics/overview` - Vue d'ensemble
- `GET /api/statistics/period` - Statistiques sur période
- `GET /api/statistics/top-products` - Top produits
- `GET /api/statistics/sellers-performance` - Performance vendeurs

## 🐛 Dépannage

### Erreur de connexion à la base de données
- Vérifiez les informations de connexion dans `.env`
- Assurez-vous que MySQL est accessible
- Vérifiez les permissions de l'utilisateur de base de données

### Erreur Node.js sur cPanel
- Vérifiez que la version Node.js est compatible (16+)
- Assurez-vous que `server.js` est défini comme fichier de démarrage
- Vérifiez les logs d'erreur dans cPanel

### Erreur CORS
- Configurez `CORS_ORIGIN` dans `.env` avec l'URL de votre frontend
- En développement, vous pouvez utiliser `*` mais pas en production

## 📝 Support

Pour toute question ou problème :
1. Vérifiez les logs d'erreur
2. Consultez la documentation de votre hébergeur cPanel
3. Assurez-vous que toutes les dépendances sont installées

## 🔄 Migration depuis MongoDB

Si vous migrez depuis l'ancienne version MongoDB :
1. Exportez vos données importantes
2. Adaptez le format des données pour MySQL
3. Utilisez les scripts de migration fournis
4. Testez en mode développement avant la production