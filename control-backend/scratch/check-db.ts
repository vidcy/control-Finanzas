import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  console.log('--- Users ---');
  console.log(users);

  for (const u of users) {
    console.log(`\n================ USER: ${u.email} (${u.id}) ================`);
    const products = await prisma.product.findMany({
      where: { userId: u.id },
      select: { id: true, name: true, stock: true, costPrice: true, salePrice: true }
    });
    console.log(`Products (${products.length}):`);
    console.log(products);

    const movements = await prisma.inventoryMovement.findMany({
      where: { userId: u.id },
      include: { product: { select: { name: true } } }
    });
    console.log(`Inventory Movements (${movements.length}):`);
    console.log(movements);

    const transactions = await prisma.transaction.findMany({
      where: { userId: u.id }
    });
    console.log(`Transactions (${transactions.length}):`);
    console.log(transactions);

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { userId: u.id },
      include: { items: true }
    });
    console.log(`Purchase Orders (${purchaseOrders.length}):`);
    console.log(purchaseOrders);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
