# Script pour corriger tous les _id en id dans les fichiers frontend
$frontendPath = "C:\Users\NajibCHAFEI-NISGROUP\OneDrive - NIS GROUP\Documents\projets\PainPerdu\frontend\src"

# Trouve tous les fichiers .jsx dans le dossier frontend
$jsxFiles = Get-ChildItem -Path $frontendPath -Recurse -Filter "*.jsx"

foreach ($file in $jsxFiles) {
    Write-Host "Correction de $($file.FullName)..."
    
    # Lit le contenu du fichier
    $content = Get-Content -Path $file.FullName -Raw
    
    # Effectue les remplacements
    $originalContent = $content
    $content = $content -replace '(\w+)\._id\b', '$1.id'
    
    # Si le fichier a été modifié, l'écrit
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✅ Fichier corrigé"
    } else {
        Write-Host "  ℹ️  Aucune modification nécessaire"
    }
}

Write-Host "🎉 Correction terminée!"