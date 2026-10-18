const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve('../control-backend/.env'), 'utf8');
console.log('--- .env DATABASE_URL ---');
envContent.split('\n').filter(l => l.includes('DATABASE_URL')).forEach(l => console.log(l));

const prismaService = fs.readFileSync(path.resolve('../control-backend/src/prisma/prisma.service.ts'), 'utf8');
console.log('--- prisma.service.ts ---');
console.log(prismaService);
