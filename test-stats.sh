#!/bin/bash

echo "🔐 Test de connexion..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@painperdu.com","password":"password"}')

echo "Response de login: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Impossible d'obtenir le token"
  exit 1
fi

echo "✅ Token obtenu: ${TOKEN:0:20}..."

echo ""
echo "📊 Test des statistiques dashboard..."
curl -s -X GET http://localhost:5000/api/statistics/dashboard \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

echo ""
echo "📦 Test des produits..."
PRODUCTS=$(curl -s -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN")
echo "Nombre de produits: $(echo $PRODUCTS | grep -o '"_id"' | wc -l)"

echo ""
echo "👥 Test des utilisateurs..."
USERS=$(curl -s -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer $TOKEN")
echo "Nombre d'utilisateurs: $(echo $USERS | grep -o '"_id"' | wc -l)"