const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../../control-backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ take: 3 });
  console.log('Users found:', users.map(u => ({ id: u.id, email: u.email, role: u.role, ruc: u.businessRuc })));
  if (users.length > 0) {
    const updated = await prisma.user.update({
      where: { id: users[0].id },
      data: { businessRuc: '20601234567' }
    });
    console.log('Update success! Updated RUC for', updated.email, 'to:', updated.businessRuc);
  }
}

run()
  .catch((e) => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
