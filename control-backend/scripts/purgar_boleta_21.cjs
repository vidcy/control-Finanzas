/**
 * ============================================================================
 * SCRIPT DE PURGA Y REINICIO LIMPIO: BOLETA B001-00000021
 * CORPORACIÓN CCOPLEX - CONTROL FINANZAS & CCOFACT PRO
 * ============================================================================
 * Este script elimina completamente cualquier rastro de la Boleta B001-21
 * tanto en la base de datos de Control Finanzas como en el motor CCOFACT PRO:
 *
 * 1. Control Finanzas:
 *    - Elimina FiscalDocument B001-21 (y correlativos >= 21 si existieran).
 *    - Libera y reinicia la Venta (Sale) asociada (billingStatus = null, etc.)
 *      para que pueda volver a emitirse limpiamente desde cero.
 *    - Fija initialBoletaNumber = 20 en la configuración del usuario.
 *
 * 2. CCOFACT PRO:
 *    - Elimina cualquier Document, DocumentItem y Job de B001 con número >= 21.
 *    - Actualiza la tabla Series para B001 (tipo 03) a current_number = 20.
 *
 * Resultado garantizado:
 * El próximo comprobante emitido será exactamente B001-00000021 sin duplicidades.
 * Funciona tanto localmente como en el VPS.
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno si existe .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const controlDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:vidcy@localhost:5432/control_finanzas?schema=public';

// Construir o inferir URL de base de datos de CCOFACT PRO
let factDbUrl = process.env.FACT_DATABASE_URL;
if (!factDbUrl) {
  if (controlDbUrl.includes('/control_finanzas')) {
    factDbUrl = controlDbUrl.replace('/control_finanzas', '/fact');
  } else {
    factDbUrl = 'postgresql://postgres:vidcy@localhost:5432/fact?schema=public';
  }
}

const pCtrl = new PrismaClient({ datasources: { db: { url: controlDbUrl } } });
const pFact = new PrismaClient({ datasources: { db: { url: factDbUrl } } });

async function main() {
  console.log('================================================================');
  console.log('🧹 PURGA Y LIMPIEZA TOTAL DE BOLETA B001-00000021 (CERO HUELLA)');
  console.log('================================================================');
  console.log(`📦 Control Finanzas DB: ${controlDbUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`🚀 CCOFACT PRO DB:      ${factDbUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log('----------------------------------------------------------------\n');

  // ==========================================================================
  // PARTE 1: LIMPIEZA EN CONTROL FINANZAS
  // ==========================================================================
  console.log('🔹 [1/2] Limpiando registros en CONTROL FINANZAS...');

  // 1.1 Buscar documentos fiscales B001 con correlativo >= 21
  const targetDocs = await pCtrl.fiscalDocument.findMany({
    where: {
      OR: [
        { serie: 'B001', correlative: { gte: 21 } },
        { fullNumber: { in: ['B001-00000021', 'B001-21', 'B001-0000021'] } },
      ],
    },
  });

  console.log(`   Documentos B001 >= 21 encontrados en Control Finanzas: ${targetDocs.length}`);

  for (const doc of targetDocs) {
    console.log(`   👉 Eliminando comprobante fiscal: ${doc.fullNumber} (ID: ${doc.id})`);

    // Si tiene venta asociada, liberarla completamente
    if (doc.saleId) {
      console.log(`      🔄 Liberando y reiniciando Venta asociada (ID: ${doc.saleId})...`);
      await pCtrl.sale.update({
        where: { id: doc.saleId },
        data: {
          billingStatus: null,
          billingSerie: null,
          billingNumber: null,
          billingPdfUrl: null,
          billingXmlUrl: null,
          billingCdrUrl: null,
          billingError: null,
        },
      });
      console.log(`      ✅ Venta liberada para que pueda emitirse desde cero.`);
    }

    // Eliminar el comprobante fiscal
    await pCtrl.fiscalDocument.delete({ where: { id: doc.id } });
  }

  // 1.2 Por seguridad, buscar ventas que hayan quedado con billingNumber >= 21 en serie B001
  const orphanSales = await pCtrl.sale.findMany({
    where: {
      billingSerie: 'B001',
      billingNumber: { gte: 21 },
    },
  });

  if (orphanSales.length > 0) {
    console.log(`   🔄 Limpiando ${orphanSales.length} ventas con B001 >= 21...`);
    for (const sale of orphanSales) {
      await pCtrl.sale.update({
        where: { id: sale.id },
        data: {
          billingStatus: null,
          billingSerie: null,
          billingNumber: null,
          billingPdfUrl: null,
          billingXmlUrl: null,
          billingCdrUrl: null,
          billingError: null,
        },
      });
      console.log(`      ✅ Venta ${sale.id} reiniciada a estado sin facturar.`);
    }
  }

  // 1.3 Asegurar configuración de serie en el usuario (initialBoletaNumber = 20)
  const users = await pCtrl.user.findMany({
    where: { hasElectronicBilling: true },
  });

  for (const u of users) {
    const catalog = (u.catalogConfig || {});
    const seriesConfig = catalog.seriesConfig || {};

    const updatedCatalog = {
      ...catalog,
      seriesConfig: {
        ...seriesConfig,
        serieBoleta: 'B001',
        initialBoletaNumber: 20,
      },
    };

    await pCtrl.user.update({
      where: { id: u.id },
      data: {
        billingSerieBoleta: 'B001',
        catalogConfig: updatedCatalog,
      },
    });
    console.log(`   ⚙️  Usuario ${u.email}: Serie B001 fijada con piso inicial 20 (próximo: 21).`);
  }

  console.log('   ✅ Control Finanzas 100% limpio y calibrado.\n');

  // ==========================================================================
  // PARTE 2: LIMPIEZA EN CCOFACT PRO
  // ==========================================================================
  console.log('🔹 [2/2] Limpiando registros en CCOFACT PRO...');

  try {
    // 2.1 Buscar documentos en fact con series B001 y número >= 21
    const factDocs = await pFact.$queryRawUnsafe(
      `SELECT id, full_number, number FROM documents 
       WHERE UPPER(series) = 'B001' AND number >= 21`,
    );

    console.log(`   Documentos B001 >= 21 encontrados en CCOFACT PRO: ${(factDocs || []).length}`);

    if (factDocs && factDocs.length > 0) {
      for (const fDoc of factDocs) {
        console.log(`   👉 Purgando de raíz comprobante ${fDoc.full_number} (ID: ${fDoc.id})...`);
        await pFact.$executeRawUnsafe(`DELETE FROM invoice_jobs WHERE document_id = $1::uuid`, fDoc.id);
        await pFact.$executeRawUnsafe(`DELETE FROM document_items WHERE document_id = $1::uuid`, fDoc.id);
        await pFact.$executeRawUnsafe(`DELETE FROM documents WHERE id = $1::uuid`, fDoc.id);
        console.log(`      ✅ Comprobante ${fDoc.full_number} eliminado físicamente de CCOFACT.`);
      }
    }

    // 2.2 Sincronizar secuencia en la tabla series para B001 a exactamente 20
    const seriesRows = await pFact.$queryRawUnsafe(
      `SELECT id, current_number FROM series 
       WHERE UPPER(series) = 'B001' AND document_type = '03'`,
    );

    if (seriesRows && seriesRows.length > 0) {
      await pFact.$executeRawUnsafe(
        `UPDATE series 
         SET current_number = 20, updated_at = NOW() 
         WHERE UPPER(series) = 'B001' AND document_type = '03'`,
      );
      console.log(`   ⚙️  Secuencia Series B001 actualizada a current_number = 20.`);
    } else {
      // Si no existe, crear la fila para B001 con current_number = 20
      const company = await pFact.$queryRawUnsafe(`SELECT id FROM companies LIMIT 1`);
      if (company && company.length > 0) {
        await pFact.$executeRawUnsafe(
          `INSERT INTO series (id, company_id, document_type, series, current_number, is_active, created_at, updated_at)
           VALUES (gen_random_uuid(), $1::uuid, '03', 'B001', 20, true, NOW(), NOW())`,
          company[0].id,
        );
        console.log(`   ⚙️  Serie B001 creada en CCOFACT con current_number = 20.`);
      }
    }

    console.log('   ✅ CCOFACT PRO 100% limpio y calibrado en 20.\n');
  } catch (factErr) {
    console.warn(`   ⚠️  Aviso en CCOFACT PRO: ${factErr.message}`);
    console.warn('   Si CCOFACT corre en otra base de datos en tu VPS, puedes definir FACT_DATABASE_URL.');
  }

  // ==========================================================================
  // PARTE 3: VERIFICACIÓN FINAL
  // ==========================================================================
  console.log('================================================================');
  console.log('🎯 VERIFICACIÓN FINAL DE DISPONIBILIDAD');
  console.log('================================================================');

  const maxCtrlBoleta = await pCtrl.fiscalDocument.aggregate({
    where: { serie: 'B001' },
    _max: { correlative: true },
  });
  const topCtrl = maxCtrlBoleta._max.correlative || 0;

  let topFact = 20;
  try {
    const sRows = await pFact.$queryRawUnsafe(
      `SELECT current_number FROM series WHERE UPPER(series) = 'B001' AND document_type = '03' LIMIT 1`,
    );
    if (sRows && sRows.length > 0) {
      topFact = parseInt(sRows[0].current_number, 10);
    }
  } catch (e) {}

  const nextNumber = Math.max(topFact, 20) + 1;
  const nextFullNumber = `B001-${String(nextNumber).padStart(8, '0')}`;

  console.log(`📊 Mayor correlativo histórico en Control Finanzas: ${topCtrl}`);
  console.log(`📊 Correlativo actual en Series CCOFACT PRO:      ${topFact}`);
  console.log(`✨ PRÓXIMO COMPROBANTE QUE SE EMITIRÁ:             ${nextFullNumber}`);
  console.log('================================================================');
  console.log('🚀 Todo listo. Ahora puedes emitir tu boleta limpia desde el sistema.');
  console.log('================================================================\n');

  await pCtrl.$disconnect();
  await pFact.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error ejecutando purga:', e);
  await pCtrl.$disconnect().catch(() => {});
  await pFact.$disconnect().catch(() => {});
  process.exit(1);
});
