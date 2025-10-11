# Script pour corriger les références inventory.seller en inventory.sellerInfo
$inventoriesFile = "C:\Users\NajibCHAFEI-NISGROUP\OneDrive - NIS GROUP\Documents\projets\PainPerdu\frontend\src\pages\admin\Inventories.jsx"

Write-Host "Correction des références seller en sellerInfo dans $inventoriesFile..."

# Lit le contenu du fichier
$content = Get-Content -Path $inventoriesFile -Raw

# Effectue les remplacements
$originalContent = $content
$content = $content -replace 'inventory\.seller(?!Info)', 'inventory.sellerInfo'

# Si le fichier a été modifié, l'écrit
if ($content -ne $originalContent) {
    Set-Content -Path $inventoriesFile -Value $content -NoNewline
    Write-Host "✅ Fichier corrigé"
} else {
    Write-Host "ℹ️  Aucune modification nécessaire"
}

Write-Host "🎉 Correction terminée!"