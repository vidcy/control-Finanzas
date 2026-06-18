import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  console.log('--- USERS ---');
  console.log(users);

  const products = await prisma.product.findMany({
    include: { presentations: true }
  });
  console.log('--- PRODUCTS ---');
  console.log(JSON.stringify(products, null, 2));

  const shifts = await prisma.cashShift.findMany();
  console.log('--- CASH SHIFTS ---');
  console.log(shifts);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

