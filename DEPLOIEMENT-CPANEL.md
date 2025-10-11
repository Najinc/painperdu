# 🚀 Guide de Déploiement PainPerdu sur cPanel

## ✅ Étapes de déploiement

### 1. Préparation locale (FAIT ✅)
- [x] Frontend buildé dans `frontend/dist/`
- [x] Configuration MySQL/SQLite adaptative créée
- [x] Scripts de production ajoutés

### 2. Sur cPanel - Base de données MySQL

1. **Créer une base de données MySQL**
   - Aller dans "Bases de données MySQL"
   - Créer une nouvelle base : `painperdu_prod` (ou autre nom)
   - Noter le nom complet (souvent préfixé par votre nom d'utilisateur)

2. **Créer un utilisateur MySQL**
   - Créer un nouvel utilisateur : `painperdu_user`
   - Mot de passe fort
   - Assigner l'utilisateur à la base avec TOUS les privilèges

### 3. Sur cPanel - Application Node.js

1. **Créer l'application Node.js**
   - Aller dans "Node.js App"
   - Créer nouvelle application
   - Version Node.js : 18.x ou plus récente
   - Répertoire de l'application : `backend-mysql`
   - Fichier de démarrage : `server.js`

### 4. Upload des fichiers

#### Backend
1. Créer le dossier `backend-mysql` dans votre répertoire principal
2. Uploader TOUS les fichiers du dossier `backend-mysql/` LOCAL vers ce dossier
3. **Exclure** : `node_modules`, `database.sqlite`, `.env`

#### Frontend  
1. Uploader le contenu du dossier `frontend/dist/` dans `public_html/`
   - `index.html` → `public_html/index.html`
   - `assets/` → `public_html/assets/`

### 5. Configuration des variables d'environnement

Dans l'interface Node.js App de cPanel, ajouter ces variables :

```
NODE_ENV=production
JWT_SECRET=votre_super_secret_jwt_key_production_2024
DB_HOST=localhost
DB_NAME=votre_nom_base_complete
DB_USER=votre_utilisateur_mysql
DB_PASSWORD=votre_mot_de_passe_mysql
DB_PORT=3306
```

### 6. Installation et démarrage

1. **Dans le terminal de l'app Node.js** :
```bash
npm install
npm run init-production
npm run sample-data
npm start
```

### 7. Configuration du frontend pour l'API

Modifier `public_html/assets/index-*.js` pour pointer vers votre domaine :
- Remplacer `http://localhost:3002` par `https://votre-domaine.com`
- Ou configurer un proxy dans cPanel

### 8. Test final

1. Visiter votre site web
2. Tester la connexion admin : `admin` / `admin123`
3. Tester les fonctionnalités principales

## 🔧 Dépannage

### Erreurs communes :
- **500 Error** : Vérifier les variables d'environnement
- **Base de données** : Vérifier nom complet de la base
- **API non accessible** : Configurer CORS/proxy
- **App ne démarre pas** : Vérifier les logs Node.js

### Logs à consulter :
- Logs de l'application Node.js dans cPanel
- Logs d'erreur du site web
- Console développeur du navigateur

## 📝 Post-déploiement

1. Changer les mots de passe par défaut
2. Configurer HTTPS
3. Sauvegarder la base de données
4. Tester toutes les fonctionnalités

## 🆘 Support

Si problème, vérifier dans l'ordre :
1. Variables d'environnement
2. Connexion base de données  
3. Permissions fichiers
4. Configuration Node.js
5. CORS/Proxy pour l'API