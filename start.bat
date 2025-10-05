@echo off
REM Script de démarrage pour PainPerdu sur Windows

echo 🥖 Démarrage de PainPerdu...

REM Vérifier si Docker est installé
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker n'est pas installé. Veuillez l'installer d'abord.
    pause
    exit /b 1
)

REM Vérifier si Docker Compose est installé
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord.
    pause
    exit /b 1
)

REM Créer le fichier .env s'il n'existe pas
if not exist ".env" (
    echo 📋 Création du fichier .env...
    copy .env.example .env >nul
    echo ✅ Fichier .env créé. Vous pouvez le modifier si nécessaire.
)

REM Arrêter les services existants
echo 🔄 Arrêt des services existants...
docker-compose down

REM Construire et démarrer les services
echo 🚀 Construction et démarrage des services...
docker-compose up --build -d

REM Attendre que les services soient prêts
echo ⏳ Attente du démarrage des services...
timeout /t 10 /nobreak >nul

REM Vérifier le statut des services
echo 📊 Vérification du statut des services...
docker-compose ps

echo.
echo 🎉 PainPerdu est maintenant accessible !
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:5000
echo 🗄️ MongoDB: localhost:27017
echo.
echo 👤 Comptes de test:
echo    Admin: admin@painperdu.com / password
echo    Vendeuse: vendeuse@painperdu.com / password
echo.
echo 📋 Commandes utiles:
echo    docker-compose logs -f          # Voir tous les logs
echo    docker-compose logs -f backend  # Logs du backend
echo    docker-compose logs -f frontend # Logs du frontend
echo    docker-compose down             # Arrêter l'application
echo    docker-compose restart backend  # Redémarrer le backend
echo.

REM Ouvrir le navigateur automatiquement
start http://localhost:3000

echo Appuyez sur une touche pour continuer...
pause >nul