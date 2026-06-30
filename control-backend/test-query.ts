import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    include: {
      stocks: {
        include: {
          product: true
        }
      }
    }
  });
  console.log('--- BRANCHES AND STOCKS ---');
  console.log(JSON.stringify(branches, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
