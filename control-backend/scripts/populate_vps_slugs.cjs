const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🔄 Sincronizando businessSlug en base de datos PostgreSQL...');

  const knownSlugs = {
    'beaz.estileza@gmail.com': 'veaz-estileza',
    'reydavidylosfelinosdelarpa@gmail.com': 'electrodomesticos-ayca',
    'davidccopayapura@gmail.com': 'corporacion-ccoplex',
    'admin@admin.com': 'corporacion-comercial-global-s-a-c',
    'raquelccopa@gmail.com': 'raquel-ccopa-yapura',
  };

  const users = await prisma.user.findMany();
  console.log(`📋 Total usuarios encontrados: ${users.length}`);

  for (const u of users) {
    const emailKey = (u.email || '').toLowerCase().trim();
    let targetSlug = knownSlugs[emailKey];

    if (!targetSlug) {
      if (u.businessSlug && u.businessSlug.trim().length > 0) {
        targetSlug = u.businessSlug.trim();
      } else {
        const baseName = u.businessName || u.businessReason || u.name || 'mi-tienda';
        targetSlug = slugify(baseName) || `tienda-${u.id.substring(0, 8)}`;
      }
    }

    try {
      const updatePayload = { businessSlug: targetSlug };
      if (!u.ccofactUrl) {
        updatePayload.ccofactUrl = 'http://localhost:4001/api/v1/ccofact/emitir';
      }
      if (!u.ccofactApiKey) {
        updatePayload.ccofactApiKey = 'fact_live_0b092b0566440eac2c9ecae8649e5f635569d163dcfa8365';
      }
      if (u.hasElectronicBilling === false || u.hasElectronicBilling === null) {
        updatePayload.hasElectronicBilling = true;
      }

      await prisma.user.update({
        where: { id: u.id },
        data: updatePayload,
      });
      console.log(`  ✓ Usuario ${u.email}: businessSlug = "${targetSlug}", ccofactApiKey sync OK`);
    } catch (err) {
      console.warn(`  ⚠️ No se pudo asignar "${targetSlug}" a ${u.email}:`, err.message);
    }
  }

  console.log('✅ Sincronización de businessSlug completada exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error al sincronizar slugs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

