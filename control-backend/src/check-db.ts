import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('🔄 Conectando a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión establecida con éxito.');
    
    const count = await prisma.user.count();
    console.log(`📊 Número de usuarios registrados: ${count}`);
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
