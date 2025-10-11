#!/bin/bash
# Script de déploiement automatique pour cPanel
# À exécuter dans le terminal de l'application Node.js

echo "🚀 Déploiement PainPerdu sur cPanel..."
echo "======================================"

# 1. Installation des dépendances
echo "📦 Installation des dépendances..."
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

# 2. Vérification des variables d'environnement
echo "🔧 Vérification de la configuration..."
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  Variables d'environnement manquantes !"
    echo "Assurez-vous de configurer : DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
    echo "Dans l'interface Node.js App de cPanel"
    exit 1
fi

# 3. Initialisation de la base de données
echo "🗄️  Initialisation de la base de données..."
npm run init-production

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'initialisation de la base"
    exit 1
fi

# 4. Création des données d'exemple
echo "📊 Création des données d'exemple..."
npm run sample-data

if [ $? -ne 0 ]; then
    echo "⚠️  Erreur lors de la création des données (non critique)"
fi

echo ""
echo "✅ Déploiement terminé avec succès !"
echo "======================================"
echo "🌐 L'application est prête à démarrer"
echo "📝 Comptes créés :"
echo "   - Admin: admin / admin123"
echo "   - Vendeurs: marie / password123, sophie / password123"
echo ""
echo "🔄 Pour démarrer l'application : npm start"