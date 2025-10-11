@echo off
echo Demarrage du serveur PainPerdu...
cd /d "C:\Users\NajibCHAFEI-NISGROUP\OneDrive - NIS GROUP\Documents\projets\PainPerdu\backend-mysql"
start /min node server.js
echo Serveur demarre en arriere-plan
timeout /t 3 /nobreak > nul
echo Serveur pret sur http://localhost:3002