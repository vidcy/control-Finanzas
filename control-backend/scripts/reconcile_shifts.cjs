/**
 * SCRIPT DE RECONCILIACIÓN MASIVA Y AUDITORÍA DE CAJAS & TESORERÍA
 * Ejecución en VPS: node scripts/reconcile_shifts.cjs
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=====================================================');
  console.log('🔍 INICIANDO AUDITORÍA Y RECONCILIACIÓN EN VPS...');
  console.log('=====================================================\n');

  const closedShifts = await prisma.cashShift.findMany({
    where: { status: 'CLOSED' },
    include: {
      user: true,
      sales: {
        include: { fiscalDocument: true, items: true },
      },
    },
    orderBy: { closedAt: 'desc' },
  });

  console.log(`📋 Total de turnos cerrados encontrados: ${closedShifts.length}`);

  let totalReconciled = 0;
  let totalAdjustmentsCreated = 0;

  for (const shift of closedShifts) {
    const allSales = shift.sales || [];
    const cancelledSales = allSales.filter(
      (s) =>
        s.billingStatus === 'CANCELLED' ||
        s.fiscalDocument?.status === 'CANCELLED',
    );

    if (cancelledSales.length === 0) {
      continue;
    }

    console.log(`\n-----------------------------------------------------`);
    console.log(`Turno: ${shift.id} (Cerrado: ${shift.closedAt})`);
    console.log(`  Vendedor/Usuario: ${shift.user?.name || shift.userId}`);
    console.log(`  Ventas totales registradas: ${allSales.length}`);
    console.log(`  ⚠️ Ventas anuladas detectadas: ${cancelledSales.length}`);

    // Ventas válidas
    const validSales = allSales.filter(
      (s) =>
        s.billingStatus !== 'CANCELLED' &&
        s.fiscalDocument?.status !== 'CANCELLED',
    );

    const validTotalSales = parseFloat(
      validSales.reduce((acc, s) => acc + s.amount, 0).toFixed(2),
    );
    const validCashSales = validSales
      .filter((s) => !s.paymentMethod || s.paymentMethod === 'CASH' || s.paymentMethod === 'EFECTIVO')
      .reduce((acc, s) => acc + s.amount, 0);

    const validFinalBalance = parseFloat(
      (shift.initialBalance + validCashSales).toFixed(2),
    );

    // Actualizar registro del turno
    await prisma.cashShift.update({
      where: { id: shift.id },
      data: {
        totalSales: validTotalSales,
        finalBalance: validFinalBalance,
        expectedBalance: validFinalBalance,
      },
    });

    console.log(`  ✅ Turno actualizado: Ventas netas S/ ${validTotalSales} | Balance final S/ ${validFinalBalance}`);

    // Buscar categoría de egreso para ajustes
    const ownerId = shift.user?.parentId || shift.userId;
    let cat = await prisma.category.findFirst({
      where: {
        userId: ownerId,
        type: 'EXPENSE',
        OR: [
          { name: { contains: 'Ajuste', mode: 'insensitive' } },
          { name: { contains: 'Devoluc', mode: 'insensitive' } },
          { name: { contains: 'Caja', mode: 'insensitive' } },
          { name: { contains: 'Egreso', mode: 'insensitive' } },
        ],
      },
    });

    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: 'Ajustes y Devoluciones de Caja',
          type: 'EXPENSE',
          userId: ownerId,
        },
      });
    }

    // Registrar contra-asientos de egreso en tesorería para cada venta anulada
    for (const cs of cancelledSales) {
      const docRef =
        cs.fiscalDocument?.fullNumber ||
        (cs.billingSerie && cs.billingNumber
          ? `${cs.billingSerie}-${String(cs.billingNumber).padStart(8, '0')}`
          : cs.code || cs.id);

      const cashAmount =
        !cs.paymentMethod || cs.paymentMethod === 'CASH' || cs.paymentMethod === 'EFECTIVO'
          ? cs.amount
          : 0;

      const existingAdj = await prisma.transaction.findFirst({
        where: {
          cashShiftId: shift.id,
          description: { contains: docRef },
        },
      });

      if (existingAdj) {
        console.log(`  ℹ️ Ajuste para ${docRef} ya existe en tesorería (ID: ${existingAdj.id}).`);
      } else if (cashAmount > 0) {
        const bitacoraDesc = `[BITÁCORA DE AJUSTE: ANULADO] Referencia: ${docRef}. Turno de Caja: ${shift.id.substring(0, 8)}... Motivo: ${cs.fiscalDocument?.sunatDescription || cs.billingError || 'Anulación formal de comprobante'}. Monto descontado de tesorería: S/ ${cashAmount.toFixed(2)}`;

        const newAdj = await prisma.transaction.create({
          data: {
            name: 'Ajuste por Anulación de Venta',
            type: 'EXPENSE',
            amount: parseFloat(cashAmount.toFixed(2)),
            categoryId: cat.id,
            date: new Date(),
            status: 'PAID',
            currency: 'PEN',
            paymentMethod: 'CASH',
            description: bitacoraDesc,
            workspace: 'BUSINESS',
            branchId: cs.branchId || shift.branchId,
            cashShiftId: shift.id,
            userId: cs.userId,
          },
        });
        console.log(`  🎉 NUEVO REGISTRO EN TESORERÍA CREADO: Egreso - S/ ${cashAmount} para ${docRef} (ID: ${newAdj.id})`);
        totalAdjustmentsCreated++;
      }

      // Restaurar stock en Kardex si faltaba
      const restored = await prisma.inventoryMovement.findFirst({
        where: { documentId: cs.id, reason: 'SALE_RETURN' },
      });
      if (!restored && cs.items && cs.items.length > 0) {
        for (const it of cs.items) {
          if (it.productId) {
            await prisma.product.update({
              where: { id: it.productId },
              data: { stock: { increment: it.quantity } },
            }).catch(() => {});

            if (cs.branchId) {
              const bStock = await prisma.branchStock.findUnique({
                where: { productId_branchId: { productId: it.productId, branchId: cs.branchId } },
              });
              if (bStock) {
                await prisma.branchStock.update({
                  where: { id: bStock.id },
                  data: { stock: { increment: it.quantity } },
                }).catch(() => {});
              }
            }

            await prisma.inventoryMovement.create({
              data: {
                productId: it.productId,
                quantity: it.quantity,
                type: 'IN',
                reason: 'SALE_RETURN',
                userId: cs.userId,
                unitCost: it.price,
                totalCost: Number((it.quantity * it.price).toFixed(2)),
                stockResult: 0,
                documentId: cs.id,
                branchId: cs.branchId,
              },
            }).catch(() => {});
          }
        }
        console.log(`  📦 Stock y Kardex restaurados para venta ${docRef}`);
      }
    }

    totalReconciled++;
  }

  console.log('\n=====================================================');
  console.log(`🏁 RECONCILIACIÓN COMPLETADA CON ÉXITO:`);
  console.log(`   - Turnos auditados y recalculados: ${totalReconciled}`);
  console.log(`   - Nuevos registros de egreso creados en tesorería: ${totalAdjustmentsCreated}`);
  console.log('=====================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en script de reconciliación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
