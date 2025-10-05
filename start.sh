#!/bin/bash

# Script de démarrage pour PainPerdu
# Compatible Windows (via Git Bash), macOS et Linux

echo "🥖 Démarrage de PainPerdu..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f ".env" ]; then
    echo "📋 Création du fichier .env..."
    cp .env.example .env
    echo "✅ Fichier .env créé. Vous pouvez le modifier si nécessaire."
fi

# Arrêter les services existants
echo "🔄 Arrêt des services existants..."
docker-compose down

# Construire et démarrer les services
echo "🚀 Construction et démarrage des services..."
docker-compose up --build -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut des services
echo "📊 Vérification du statut des services..."
docker-compose ps

# Attendre que l'API soit prête
echo "⏳ Attente de l'API..."
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "✅ API prête!"
        break
    fi
    sleep 2
    counter=$((counter + 2))
    echo "⏳ Attente de l'API... ($counter/$timeout secondes)"
done

if [ $counter -ge $timeout ]; then
    echo "⚠️  L'API met du temps à démarrer. Vérifiez les logs avec: docker-compose logs backend"
fi

echo ""
echo "🎉 PainPerdu est maintenant accessible !"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "🗄️  MongoDB: localhost:27017"
echo ""
echo "👤 Comptes de test:"
echo "   Admin: admin@painperdu.com / password"
echo "   Vendeuse: vendeuse@painperdu.com / password"
echo ""
echo "📋 Commandes utiles:"
echo "   docker-compose logs -f          # Voir tous les logs"
echo "   docker-compose logs -f backend  # Logs du backend"
echo "   docker-compose logs -f frontend # Logs du frontend"
echo "   docker-compose down             # Arrêter l'application"
echo "   docker-compose restart backend  # Redémarrer le backend"
echo ""

# Ouvrir le navigateur automatiquement (optionnel)
if command -v start &> /dev/null; then
    # Windows
    start http://localhost:3000
elif command -v open &> /dev/null; then
    # macOS
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:3000
fi