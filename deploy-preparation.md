# Guide de déploiement PainPerdu sur cPanel

## 1. Préparation des fichiers

### Backend (Node.js)
- Tous les fichiers du dossier `backend-mysql/`
- Configurer les variables d'environnement pour la production
- Préparer la base de données MySQL (pas SQLite)

### Frontend (React)
- Builder le projet React avec `npm run build`
- Uploader les fichiers de `dist/` dans le répertoire public_html

## 2. Configuration cPanel requise

### Node.js App
- Créer une nouvelle application Node.js
- Version Node.js : 18.x ou plus récente
- Répertoire de l'application : `/backend-mysql`
- Fichier de démarrage : `server.js`

### Base de données MySQL
- Créer une base de données MySQL
- Créer un utilisateur MySQL avec tous les privilèges
- Noter les informations de connexion

### Variables d'environnement
```
NODE_ENV=production
JWT_SECRET=votre_secret_jwt_production
DB_TYPE=mysql
DB_HOST=localhost
DB_NAME=nom_de_votre_base
DB_USER=votre_utilisateur_mysql
DB_PASSWORD=votre_mot_de_passe_mysql
DB_PORT=3306
```

## 3. Fichiers à modifier pour la production

### package.json du backend
- Ajouter le script de démarrage
- S'assurer que toutes les dépendances sont listées

### Configuration de la base de données
- Utiliser MySQL au lieu de SQLite
- Configurer les paramètres de connexion

## 4. Structure finale sur cPanel
```
/
├── public_html/          (Frontend buildé)
│   ├── index.html
│   ├── assets/
│   └── ...
├── backend-mysql/        (Application Node.js)
│   ├── server.js
│   ├── package.json
│   ├── models/
│   ├── routes/
│   └── ...
└── tmp/                  (Fichiers temporaires)
```