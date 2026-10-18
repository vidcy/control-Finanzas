import { PrismaClient, Role, ProductType, TrackingType, TreasuryAccountType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando Enterprise Seeding en PostgreSQL 18...');

  // 1. Limpiar o asegurar usuario Administrador Maestro
  const existingUser = await prisma.user.findUnique({
    where: { email: 'admin@admin.com' },
  });

  const passwordHash = await bcrypt.hash('123456', 10);

  const adminUser = existingUser || await prisma.user.create({
    data: {
      name: 'Director General',
      lastName: 'Master ERP',
      email: 'admin@admin.com',
      password: passwordHash,
      role: Role.SUPERADMIN,
      currency: 'PEN',
      isActive: true,
      businessName: 'Corporación Comercial Global S.A.C.',
      businessRuc: '20601234567',
      businessReason: 'Comercialización, Distribución y Manufactura Multi-Rubro',
      businessRubro: 'RETAIL_MULTI_RUBRO',
      profiles: ['PERSONAL', 'BUSINESS'],
      hasElectronicBilling: true,
    },
  });

  console.log('✅ Usuario Administrador Maestro listo:', adminUser.email);

  // 2. Crear Sucursal Central
  let branch = await prisma.branch.findFirst({
    where: { userId: adminUser.id, name: 'Sede Corporativa Central' },
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'Sede Corporativa Central',
        code: 'SUC-01',
        address: 'Av. Javier Prado Este 4500, Lima',
        phone: '+51 987654321',
        userId: adminUser.id,
      },
    });
  }

  // 3. Crear Almacenes WMS (Central y En Tránsito)
  let mainWarehouse = await prisma.warehouse.findFirst({
    where: { branchId: branch.id, name: 'Almacén Central Principal' },
  });

  if (!mainWarehouse) {
    mainWarehouse = await prisma.warehouse.create({
      data: {
        name: 'Almacén Central Principal',
        code: 'ALM-01',
        isDefault: true,
        branchId: branch.id,
        userId: adminUser.id,
      },
    });
  }

  // 4. Crear Terminal POS de Mostrador
  let posTerminal = await prisma.cashRegister.findFirst({
    where: { branchId: branch.id, name: 'Terminal POS 01 - Mostrador' },
  });

  if (!posTerminal) {
    posTerminal = await prisma.cashRegister.create({
      data: {
        name: 'Terminal POS 01 - Mostrador',
        code: 'POS-01',
        branchId: branch.id,
        userId: adminUser.id,
      },
    });
  }

  // 5. Crear Cuentas de Tesorería Estratégica (Separada de Caja POS)
  const existingBcp = await prisma.treasuryAccount.findFirst({
    where: { userId: adminUser.id, name: 'BCP Soles Operaciones' },
  });

  if (!existingBcp) {
    await prisma.treasuryAccount.create({
      data: {
        name: 'BCP Soles Operaciones',
        accountType: TreasuryAccountType.BANK_ACCOUNT,
        bankName: 'BCP',
        accountNumber: '193-98765432-0-88',
        cciNumber: '002-1930098765432088-14',
        currency: 'PEN',
        balance: 75000.0,
        isDefault: true,
        userId: adminUser.id,
      },
    });

    await prisma.treasuryAccount.create({
      data: {
        name: 'Bóveda de Efectivo Central',
        accountType: TreasuryAccountType.CENTRAL_VAULT,
        currency: 'PEN',
        balance: 15000.0,
        userId: adminUser.id,
      },
    });
  }

  // 6. Rubro Calzado: Producto Padre con Matriz de Variantes por Tallas y Curva por Caja
  const existingShoe = await prisma.product.findFirst({
    where: { userId: adminUser.id, name: 'Zapatilla Urbana Falcon Pro' },
  });

  if (!existingShoe) {
    const shoeProduct = await prisma.product.create({
      data: {
        name: 'Zapatilla Urbana Falcon Pro',
        description: 'Calzado deportivo con suela ergonómica. Modelo adaptable por talla y serie.',
        sku: 'ZAP-FALCON-01',
        productType: ProductType.VARIABLE,
        trackingType: TrackingType.SERIALIZED,
        costPrice: 85.0,
        salePrice: 179.0,
        wholesalePrice: 135.0,
        unit: 'PAR',
        userId: adminUser.id,
        variants: {
          create: [
            { sku: 'FALCON-BLK-38', barcode: '775000100381', name: 'Talla 38 / Negro', size: '38', color: 'Negro', costPrice: 85, salePrice: 179, stock: 10 },
            { sku: 'FALCON-BLK-39', barcode: '775000100398', name: 'Talla 39 / Negro', size: '39', color: 'Negro', costPrice: 85, salePrice: 179, stock: 15 },
            { sku: 'FALCON-BLK-40', barcode: '775000100404', name: 'Talla 40 / Negro', size: '40', color: 'Negro', costPrice: 85, salePrice: 179, stock: 24 },
            { sku: 'FALCON-BLK-41', barcode: '775000100411', name: 'Talla 41 / Negro', size: '41', color: 'Negro', costPrice: 85, salePrice: 179, stock: 20 },
            { sku: 'FALCON-BLK-42', barcode: '775000100428', name: 'Talla 42 / Negro', size: '42', color: 'Negro', costPrice: 85, salePrice: 179, stock: 12 },
          ],
        },
        seriesCurves: {
          create: {
            name: 'Caja Curva Serie Estándar (12 pares)',
            boxCode: 'BOX-FALCON-12P',
            pairsTotal: 12,
            curveDetail: [
              { size: '38', qty: 1 },
              { size: '39', qty: 2 },
              { size: '40', qty: 4 },
              { size: '41', qty: 3 },
              { size: '42', qty: 2 },
            ],
            pricePerBox: 1500.0,
          },
        },
      },
    });

    console.log('✅ Rubro Calzado inicializado con matriz de tallas y curva de empaque:', shoeProduct.name);
  }

  // 7. Rubro Farmacia: Producto con Lotes y Vencimiento FEFO
  const existingPharma = await prisma.product.findFirst({
    where: { userId: adminUser.id, name: 'Amoxicilina 500mg Cápsulas' },
  });

  if (!existingPharma) {
    const pharmaProduct = await prisma.product.create({
      data: {
        name: 'Amoxicilina 500mg Cápsulas',
        description: 'Antibiótico de amplio espectro. Control estricto por lote y fecha de vencimiento.',
        sku: 'FAR-AMOX-500',
        productType: ProductType.SIMPLE,
        trackingType: TrackingType.BATCH_EXPIRY,
        activeSubstance: 'Amoxicilina Trihidrato',
        laboratory: 'Laboratorios Genfar / Medifarma',
        requiresPrescription: true,
        costPrice: 0.35,
        salePrice: 1.20,
        unit: 'CAPSULA',
        userId: adminUser.id,
        batches: {
          create: [
            {
              batchNumber: 'LOT-2026-A12',
              expiryDate: new Date('2027-12-31'),
              initialStock: 1000,
              currentStock: 950,
              costPrice: 0.35,
            },
          ],
        },
        presentations: {
          create: [
            { name: 'Caja x 100 Cápsulas (Blister)', equivalence: 100, price: 95.0 },
            { name: 'Blister x 10 Cápsulas', equivalence: 10, price: 11.5 },
          ],
        },
      },
    });

    console.log('✅ Rubro Farmacia inicializado con lotes FEFO y presentaciones:', pharmaProduct.name);
  }

  // 8. Rubro Tecnología: Producto Serializado con IMEI Único
  const existingTech = await prisma.product.findFirst({
    where: { userId: adminUser.id, name: 'Smartphone Pro Max 256GB' },
  });

  if (!existingTech) {
    await prisma.product.create({
      data: {
        name: 'Smartphone Pro Max 256GB',
        description: 'Equipo de alta gama con garantía de 12 meses. Control por número IMEI.',
        sku: 'TECH-PH-001',
        productType: ProductType.SIMPLE,
        trackingType: TrackingType.SERIALIZED,
        costPrice: 2200.0,
        salePrice: 3499.0,
        unit: 'UNIDAD',
        userId: adminUser.id,
        serials: {
          create: [
            { serialNumber: 'IMEI-864209040123451', status: 'AVAILABLE' },
            { serialNumber: 'IMEI-864209040123452', status: 'AVAILABLE' },
            { serialNumber: 'IMEI-864209040123453', status: 'AVAILABLE' },
          ],
        },
      },
    });

    console.log('✅ Rubro Tecnología inicializado con control de series / IMEIs');
  }

  console.log('🎉 Enterprise Seed completado con éxito total en PostgreSQL 18.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
