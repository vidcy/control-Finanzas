#!/bin/bash
# deploy_local.sh - Despliegue de sincronización hacia GitHub

echo "--- 🛠️ INICIANDO SINCRONIZACIÓN LOCAL A GITHUB ---"
set -e # Detener si algo falla

# 1. Asegurar formato y limpieza
echo "🧹 Formateando código y generando cliente Prisma..."
npx prisma format
npx prisma generate

# 2. Volver a la raíz y preparar el commit
cd ..
git add .

# 3. Validar mensaje de commit
echo "📝 Escribe un mensaje corto para el commit (ej: 'feat: nuevas comisiones'):"
read mensaje

if [ -z "$mensaje" ]; then
    echo "❌ Error: El mensaje es obligatorio."
    exit 1
fi

git commit -m "$mensaje"

# 4. Sincronizar
echo "📤 Subiendo cambios a GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "------------------------------------------------"
    echo "✅ ÉXITO: Código sincronizado con GitHub."
    echo "Ahora puedes ir al VPS y ejecutar tu script de despliegue."
    echo "------------------------------------------------"
else
    echo "❌ ERROR: No se pudo subir a GitHub."
    exit 1
fi