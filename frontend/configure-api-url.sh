#!/bin/bash
# Script pour configurer l'URL API après déploiement

if [ -z "$1" ]; then
    echo "Usage: ./configure-api-url.sh <URL_API>"
    echo "Exemple: ./configure-api-url.sh https://painperdu.lamiecreme.fr:3001"
    exit 1
fi

API_URL="$1"
echo "🔧 Configuration de l'URL API : $API_URL"

# Créer le fichier .env.production
echo "VITE_API_URL=$API_URL" > .env.production

# Rebuilder le frontend
echo "🏗️  Rebuild du frontend avec la nouvelle URL..."
npm run build

echo "✅ Frontend reconfiguré avec l'URL : $API_URL"
echo "📁 Uploader le nouveau contenu de 'dist/' vers public_html/painperdu/"