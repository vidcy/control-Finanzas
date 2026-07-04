#!/bin/bash
# deploy_vps.sh - Despliegue Robusto con Git Stash y Protección de BD

# CONFIGURACIÓN (REEMPLAZA ESTOS DATOS)
DB_NAME="control_finanzas"
DB_USER="vidcy"
DB_PASS="vidcy" 
APP_NAME="control-backend"

echo "🛡️ INICIANDO DESPLIEGUE SEGURO..."
set -e # Detener el script inmediatamente si falla algún comando

# 1. Backup de seguridad antes de cualquier cambio
echo "📦 Realizando backup de la base de datos..."
mysqldump -u $DB_USER -p"$DB_PASS" $DB_NAME > "/home/vidcy/backups/bkp_$(date +%Y%m%d_%H%M%S).sql"

# 2. Gestión de conflictos de Git
echo "💾 Guardando cambios locales pendientes (stash)..."
# Usamos '|| true' para que no falle si no hay nada que hacer
git stash || true

echo "⬇️ Obteniendo cambios de GitHub..."
git pull origin main

echo "📂 Recuperando cambios locales..."
git stash pop || echo "⚠️ Nota: No hubo conflictos en el stash o no había nada que recuperar."

# 3. Instalación y Construcción
echo "📦 Instalando dependencias..."
npm install --legacy-peer-deps

echo "🔨 Compilando proyecto..."
npm run build

# 4. Migraciones seguras y Prisma
echo "⚙️ Regenerando Prisma Client..."
npx prisma generate

echo "🚀 Aplicando migraciones de forma segura..."
# 'migrate deploy' aplica cambios sin borrar datos
npx prisma migrate deploy

# 5. Reinicio de la aplicación
echo "🔄 Reiniciando aplicación con PM2..."
# Si usas otro gestor que no sea pm2, cámbialo aquí
pm2 reload all || pm2 restart all

echo "------------------------------------------------"
echo "✅ DESPLIEGUE FINALIZADO EXITOSAMENTE"
echo "--- Todos los cambios se han sincronizado ---"