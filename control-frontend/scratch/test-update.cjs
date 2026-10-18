const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  console.log('User found:', user?.email);
  try {
    const res = await prisma.user.update({
      where: { id: user.id },
      data: { businessSlug: 'test-slug' }
    });
    console.log('Update success:', res.id);
  } catch (err) {
    console.error('CATCH ERROR:', err.message);
  }
  process.exit(0);
}
run();
