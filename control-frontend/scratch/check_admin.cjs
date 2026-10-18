const path = require('path');
const backendPath = path.resolve(__dirname, '../../control-backend');
process.chdir(backendPath);
const { PrismaClient } = require(path.join(backendPath, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@admin.com' },
    select: { id: true, email: true, role: true, isActive: true, profiles: true, blockedProfiles: true, hasElectronicBilling: true }
  });
  console.log('Admin user:', user);
  await prisma.$disconnect();
}

check().catch(console.error);
