const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '..', '..', 'control-backend', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst();
  console.log('Testing native update for user:', user.email);
  try {
    const slug = 'tienda-david';
    const config = JSON.stringify({ rubro: 'Calzados', customTitle: 'Mi Gran Tienda' });
    await prisma.$executeRawUnsafe(
      'UPDATE "User" SET "businessSlug" = $1, "catalogConfig" = $2::jsonb WHERE "id" = $3',
      slug,
      config,
      user.id
    );
    console.log('Native SQL UPDATE SUCCEEDED!');
    const rows = await prisma.$queryRawUnsafe('SELECT id, email, "businessSlug", "catalogConfig" FROM "User" WHERE id = $1', user.id);
    console.log('Result from DB:', rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}
test();
