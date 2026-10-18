const { PrismaClient } = require('../../control-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

const defaultCategories = {
  INCOME: [
    { name: 'Sueldo', color: 'bg-blue-600', subcategories: [] },
    { name: 'Capacitaciones Terceros', color: 'bg-purple-500', subcategories: [] },
    { name: 'Rendimientos Inversiones', color: 'bg-yellow-500', subcategories: [] },
    { name: 'Asesorías', color: 'bg-indigo-500', subcategories: [] },
    { name: 'Beneficios Tarjeta de Crédito', color: 'bg-pink-500', subcategories: [] },
    { name: 'Comisiones', color: 'bg-orange-500', subcategories: [] },
    { name: 'Ingreso Adicional 1', color: 'bg-red-500', subcategories: [] },
    { name: 'Ingreso Adicional 2', color: 'bg-cyan-500', subcategories: [] },
    { name: 'Negocio-Ingreso', color: 'bg-green-500', subcategories: [{ name: 'Caja' }] },
  ],
  EXPENSE: [
    {
      name: 'Impuestos',
      color: 'bg-red-500',
      subcategories: [
        { name: 'Pensiones obligatorias' },
        { name: 'Renta de 5ta' },
        { name: 'Provisión de impuesto de renta' },
        { name: 'Provisión de impuesto predial' },
        { name: 'Otros impuestos' },
      ],
    },
    {
      name: 'Vivienda',
      color: 'bg-orange-500',
      subcategories: [
        { name: 'Pago de alquiler/hipoteca' },
        { name: 'Mantenimiento' },
        { name: 'Servicio doméstico' },
        { name: 'Artículos de Aseo' },
        { name: 'Electrodomésticos' },
        { name: 'Decoración' },
      ],
    },
    {
      name: 'Servicios',
      color: 'bg-amber-500',
      subcategories: [
        { name: 'Agua' },
        { name: 'Gas' },
        { name: 'Electricidad' },
        { name: 'Internet' },
        { name: 'Celular' },
      ],
    },
    {
      name: 'Alimentación',
      color: 'bg-emerald-500',
      subcategories: [
        { name: 'Supermercado' },
        { name: 'Restaurantes' },
        { name: 'Café / Snacks' },
      ],
    },
    {
      name: 'Transporte',
      color: 'bg-blue-500',
      subcategories: [
        { name: 'Combustible' },
        { name: 'Mantenimiento Vehicular' },
        { name: 'Taxi / Pasajes' },
      ],
    },
    {
      name: 'Salud',
      color: 'bg-rose-500',
      subcategories: [
        { name: 'Farmacia / Medicinas' },
        { name: 'Consultas Médicas' },
        { name: 'Seguro de Salud' },
      ],
    },
    {
      name: 'Educación',
      color: 'bg-indigo-500',
      subcategories: [
        { name: 'Cursos y Talleres' },
        { name: 'Libros y Materiales' },
      ],
    },
  ],
  TRANSFER: [
    { name: 'Transferencia entre Cuentas', color: 'bg-purple-500', subcategories: [] },
  ]
};

async function seedMissingCategories() {
  const users = await prisma.user.findMany({
    where: { parentId: null }
  });

  console.log(`Found ${users.length} parent users / business owners / admins.`);

  for (const user of users) {
    const categoryCount = await prisma.category.count({
      where: { userId: user.id }
    });

    if (categoryCount === 0) {
      console.log(`Seeding categories for user ${user.email} (${user.role})...`);
      for (const type of ['INCOME', 'EXPENSE'] ) {
        for (const cat of defaultCategories[type]) {
          const parent = await prisma.category.create({
            data: {
              name: cat.name,
              type,
              color: cat.color,
              userId: user.id,
            }
          });
          for (const sub of (cat.subcategories || [])) {
            await prisma.category.create({
              data: {
                name: sub.name,
                type,
                color: cat.color,
                parentId: parent.id,
                userId: user.id,
              }
            });
          }
        }
      }
      for (const cat of defaultCategories.TRANSFER) {
        await prisma.category.create({
          data: {
            name: cat.name,
            type: 'TRANSFER',
            color: cat.color,
            userId: user.id,
          }
        });
      }
      console.log(`✅ Seeded categories for ${user.email}`);
    } else {
      console.log(`User ${user.email} already has ${categoryCount} categories.`);
    }
  }
}

seedMissingCategories()
  .catch((e) => console.error('Error seeding categories:', e))
  .finally(() => prisma.$disconnect());
