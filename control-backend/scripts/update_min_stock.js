const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando actualización de stock mínimo en todos los productos...');

  const result = await prisma.product.updateMany({
    data: {
      minStock: 1,
    },
  });

  console.log(`✅ ¡Éxito! Se actualizaron ${result.count} productos a stock mínimo = 1.`);
}

main()
  .catch((e) => {
    console.error('❌ Error al actualizar productos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
