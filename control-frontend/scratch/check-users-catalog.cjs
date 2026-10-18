const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '..', '..', 'control-backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      businessName: true,
      businessRubro: true,
    }
  });
  console.log('Total users in DB:', users.length);
  for (const u of users) {
    const raw = await prisma.$queryRawUnsafe('SELECT "businessSlug", "catalogConfig" FROM "User" WHERE id = $1', u.id);
    console.log(`User: ${u.email} | Name: ${u.businessName || u.name} | Slug: ${raw[0]?.businessSlug} | HasConfig: ${!!raw[0]?.catalogConfig}`);
  }
  process.exit(0);
}
check();
