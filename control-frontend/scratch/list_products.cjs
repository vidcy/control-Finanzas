const path = require('path');
const backendPrisma = path.resolve(__dirname, '../../control-backend/node_modules/@prisma/client');
const { PrismaClient } = require(backendPrisma);
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, customCode: true, barcode: true, stock: true }
  });
  console.log('PRODUCTS IN DB (' + products.length + '):');
  products.forEach(p => console.log(JSON.stringify(p)));
  await prisma.$disconnect();
}
main().catch(console.error);
