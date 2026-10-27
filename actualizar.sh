#!/bin/bash
# deploy_vps.sh - Despliegue completo THINK (Backend + Frontend)

echo "🚀 ====================================================="
echo "🛡️  INICIANDO DESPLIEGUE COMPLETO EN VPS"
echo "🚀 ====================================================="

# 1. Ubicarnos en la raíz del repositorio
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
if [ -d "$SCRIPT_DIR/../control-frontend" ]; then
  REPO_ROOT="$SCRIPT_DIR/.."
else
  REPO_ROOT="$SCRIPT_DIR"
fi

cd "$REPO_ROOT"
echo "📂 Directorio de trabajo: $PWD"

# 2. Descargar últimos cambios de GitHub
echo ""
echo "⬇️  [1/4] Descargando últimos cambios de GitHub (main)..."
git stash || true
git pull origin main

# 3. Compilar Backend (NestJS + Prisma)
echo ""
echo "📦 [2/4] Compilando Backend (control-backend)..."
cd "$REPO_ROOT/control-backend"
npm install --legacy-peer-deps
npx prisma generate
npm run build

# 4. Reiniciar proceso en PM2
echo ""
echo "🔄 [3/4] Reiniciando servicio en PM2..."
pm2 restart all || pm2 reload all
pm2 status

# 5. Compilar Frontend (Vite + React)
echo ""
echo "🎨 [4/4] Compilando Frontend (control-frontend)..."
cd "$REPO_ROOT/control-frontend"
npm install --legacy-peer-deps
npm run build

echo ""
echo "====================================================="
echo "✅ ¡DESPLIEGUE FINALIZADO EXITOSAMENTE!"
echo "🌐 Catálogos públicos y sistema THINK 100% actualizados."
echo "====================================================="
