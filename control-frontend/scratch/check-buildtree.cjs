const { PrismaClient } = require('/home/vidcy/dev/projects/control-Finanzas/control-backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

const buildTree = (data) => {
  const map = new Map();
  data.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });
  const roots = [];
  data.forEach((item) => {
    if (item.parentId) {
      const parent = map.get(item.parentId);
      if (!parent) {
        console.warn(`Orphan subcategory found: ${item.name} (ID: ${item.id}) parentId: ${item.parentId}`);
      } else {
        parent.children.push(map.get(item.id));
      }
    } else {
      roots.push(map.get(item.id));
    }
  });
  return roots;
};

async function check() {
  try {
    console.log('Connecting to database...');
    const categories = await prisma.category.findMany({});
    console.log(`Fetched ${categories.length} categories.`);
    console.log('Running buildTree...');
    const tree = buildTree(categories);
    console.log(`Tree built successfully. ${tree.length} root categories.`);
  } catch (error) {
    console.error('Error during buildTree execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
