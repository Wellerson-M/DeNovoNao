$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

Set-Location $root

if (!(Test-Path "backend/.env")) {
  Copy-Item "backend/.env.example" "backend/.env"
}

if (!(Test-Path "frontend/.env.local")) {
  Copy-Item "frontend/.env.example" "frontend/.env.local"
}

Write-Host "Instalando dependencias da raiz..."
npm install

Write-Host "Instalando dependencias do backend..."
npm --prefix backend install

Write-Host "Instalando dependencias do frontend..."
npm --prefix frontend install

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "Docker encontrado. Subindo MongoDB..."
  docker compose up -d mongo
} else {
  Write-Host "Docker nao encontrado. O backend usara armazenamento em memoria."
}

Write-Host "Subindo frontend e backend..."
npm run dev
