import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    const password = await bcrypt.hash('123456', 10)

    await prisma.user.create({
        data: {
            name: 'Admin',
            lastName: 'System',
            email: 'admin@admin.com',
            password,
            role: 'ADMIN',
            isActive: true,
        },
    })
}

main()
    .then(() => console.log('Seed ejecutado'))
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect())