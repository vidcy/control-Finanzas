const path = require('path');
const backendPath = path.resolve(__dirname, '../../control-backend');
process.chdir(backendPath);
const { PrismaClient } = require(path.join(backendPath, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function clean() {
  const deleted = await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test_'
      }
    }
  });
  console.log('Cleaned test users:', deleted.count);
  await prisma.$disconnect();
}

clean().catch(console.error);
