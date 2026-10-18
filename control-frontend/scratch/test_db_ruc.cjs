const { PrismaClient } = require('../control-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    console.log('No admin user found');
    return;
  }
  console.log('Found user:', user.email, 'Current RUC:', user.businessRuc);

  const testRuc = '20609876543';
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { businessRuc: testRuc }
  });
  console.log('Database updated successfully! New businessRuc:', updated.businessRuc);
}
test().catch(console.error).finally(() => prisma.$disconnect());
