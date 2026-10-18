const { PrismaClient } = require('../../control-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  console.log('USERS IN DB:');
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      profiles: u.profiles,
      parentId: u.parentId
    });
  }
}

run().finally(() => prisma.$disconnect());
