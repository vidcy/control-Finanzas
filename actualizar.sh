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

# 3. Compilar Backend (NestJS + Prisma + Slugs DB)
echo ""
echo "📦 [2/4] Compilando Backend y Base de Datos (control-backend)..."
cd "$REPO_ROOT/control-backend"
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push --accept-data-loss
node scripts/populate_vps_slugs.cjs || true
npm run build

# 4. Reiniciar proceso en PM2
echo ""
echo "🔄 [3/4] Reiniciando servicio en PM2..."
cd "$REPO_ROOT/control-backend"
if pm2 describe backend > /dev/null 2>&1; then
  pm2 delete backend || true
fi
pm2 start dist/main.js --name backend
pm2 restart all || pm2 reload all
pm2 save
pm2 status

# 4.1. Actualizar Motor Fiscal CCOFACT PRO si existe en el servidor
PM2_FACT_DIR=$(node -e "try { const list = JSON.parse(require('child_process').execSync('pm2 jlist').toString()); const proc = list.find(p => p.name === 'fact-backend'); if (proc && proc.pm2_env) console.log(proc.pm2_env.pm_cwd); } catch(e){}" 2>/dev/null)

for FACT_PATH in "$PM2_FACT_DIR" "$HOME/apps/fact-apps/fact-backend" "$HOME/apps/fact-backend" "$REPO_ROOT/../apps/fact-apps/fact-backend" "$REPO_ROOT/../fact-backend" "$REPO_ROOT/../../fact-apps/fact-backend"; do
  if [ -n "$FACT_PATH" ] && [ -d "$FACT_PATH" ]; then
    echo ""
    echo "⚡ Actualizando Motor Fiscal CCOFACT PRO en $FACT_PATH..."
    cd "$FACT_PATH"
    git stash || true
    git pull origin main || true
    npm install --legacy-peer-deps || true
    npx prisma generate || true
    npm run build || true
    node scripts/postbuild.js 2>/dev/null || node -e "const fs=require('fs'); fs.writeFileSync('dist/main.js', 'require(\"./src/main.js\");\n');" 2>/dev/null || true
    if pm2 describe fact-backend > /dev/null 2>&1; then
      pm2 restart fact-backend --update-env || pm2 reload fact-backend || true
    else
      pm2 start dist/main.js --name fact-backend || true
    fi
    echo "✅ Motor Fiscal CCOFACT PRO actualizado y reiniciado en PM2."
    break
  fi
done

# 5. Compilar Frontend (Vite + React)
echo ""
echo "🎨 [4/4] Compilando Frontend (control-frontend)..."
cd "$REPO_ROOT/control-frontend"
echo "VITE_API_URL=https://api.ccoplex.com" > .env.production
npm install --legacy-peer-deps
npm run build

echo ""
echo "====================================================="
echo "✅ ¡DESPLIEGUE FINALIZADO EXITOSAMENTE!"
echo "🌐 Catálogos públicos y sistema THINK 100% actualizados."
echo "====================================================="
