# Crée l'archive du projet (PowerShell) sans secrets, caches, dépendances ni builds.
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$out = Join-Path (Split-Path $root -Parent) "ciat-dashboard.zip"
if (Test-Path $out) { Remove-Item $out }
$exclude = '\\(node_modules|dist|__pycache__|\.pytest_cache|\.ruff_cache|staticfiles|\.git|backups|\.venv)\\'
$files = Get-ChildItem $root -Recurse -File | Where-Object { $_.FullName -notmatch $exclude -and $_.Name -notmatch '^\.env$|^\.env\.(?!example)|\.pyc$|\.zip$' }
Compress-Archive -Path $files.FullName -DestinationPath $out
Write-Host "Archive créée : $out"
