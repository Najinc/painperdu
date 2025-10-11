#!/bin/bash

echo "🚀 Déploiement PainPerdu sur cPanel"
echo "===================================="

# Configuration
REMOTE_HOST="votre-domaine.com"
REMOTE_USER="votre-username"
REMOTE_PATH="/public_html/api"  # Ajustez selon votre configuration cPanel

echo "📦 Préparation des fichiers..."

# Créer un dossier de build
rm -rf build
mkdir build

# Copier les fichiers nécessaires (sans node_modules)
cp -r backend-mysql/* build/
rm -rf build/node_modules

# Copier le frontend compilé
echo "📱 Compilation du frontend..."
cd frontend
npm run build
cd ..
cp -r frontend/dist build/public

echo "📋 Fichiers à déployer:"
find build -type f -name "*.js" -o -name "*.json" -o -name "*.html" | head -20

echo ""
echo "⚠️  ÉTAPES MANUELLES NÉCESSAIRES:"
echo "1. Connectez-vous à votre cPanel"
echo "2. Créez une base de données MySQL"
echo "3. Uploadez le contenu du dossier 'build' vers votre serveur"
echo "4. Configurez le fichier .env avec vos paramètres de base de données"
echo "5. Installez les dépendances avec 'npm install' sur le serveur"
echo "6. Exécutez les migrations avec 'npm run migrate'"
echo ""
echo "📝 Fichier .env requis:"
echo "DB_HOST=localhost"
echo "DB_NAME=votre_base_de_donnees"
echo "DB_USER=votre_utilisateur"
echo "DB_PASSWORD=votre_mot_de_passe"
echo "JWT_SECRET=votre_secret_jwt_unique"
echo "NODE_ENV=production"
echo "PORT=3000"

echo ""
echo "✅ Préparation terminée! Dossier 'build' prêt pour le déploiement."