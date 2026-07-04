#!/bin/bash
# sync-to-vps.sh
cd control-backend
echo "Nombre para la migración (ej: add_advisor_label):"
read nombre
npx prisma migrate dev --name $nombre
cd ..
git add .
git commit -m "Migración: $nombre"
git push origin main
echo "✅ Migración creada y subida a GitHub."
