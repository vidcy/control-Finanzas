const fs = require('fs');
const path = require('path');

// 1. Update users.service.ts
const usersServicePath = path.resolve(__dirname, '../../control-backend/src/users/users.service.ts');
let usersServiceCode = fs.readFileSync(usersServicePath, 'utf8');

// Regex replace createUsers
const regexCreate = /profiles:\s*data\.profiles\s*&&\s*data\.profiles\.length\s*>\s*0\s*\?\s*data\.profiles\s*:\s*\['PERSONAL'\],\s*isActive:\s*data\.isActive\s*!==\s*undefined\s*\?\s*data\.isActive\s*:\s*true,\s*parentId:\s*data\.parentId\s*\|\|\s*null,/;

const replacementCreate = `profiles:
          data.profiles && data.profiles.length > 0
            ? data.profiles
            : ['PERSONAL'],
        blockedProfiles: data.blockedProfiles || [],
        hasElectronicBilling: !!data.hasElectronicBilling,
        isActive: data.isActive !== undefined ? data.isActive : true,
        parentId: data.parentId || null,`;

if (regexCreate.test(usersServiceCode)) {
  usersServiceCode = usersServiceCode.replace(regexCreate, replacementCreate);
  console.log('✅ users.service.ts createUsers successfully patched');
  fs.writeFileSync(usersServicePath, usersServiceCode, 'utf8');
} else {
  console.log('⚠️ regexCreate did not match');
}

// 2. Update category.service.ts
const categoryServicePath = path.resolve(__dirname, '../../control-backend/src/category/category.service.ts');
let categoryServiceCode = fs.readFileSync(categoryServicePath, 'utf8');

const regexFindAll = /\/\/\s*🔹\s*Obtener\s*SOLO\s*categorías[^\n]*\n\s*findAllByUser\(userId:\s*string\)\s*\{[\s\S]*?return\s*this\.prisma\.category\.findMany\(\{[\s\S]*?orderBy:\s*\{\s*createdAt:\s*'desc',\s*\},\s*\}\);\s*\}/;

const replacementFindAll = `// 🔹 Obtener categorías del usuario (con auto-seed si está vacío)
  async findAllByUser(userId: string) {
    // Si es trabajador, usar las categorías del patrón/negocio
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, parentId: true, role: true },
    });
    const effectiveUserId = user?.parentId || userId;

    let categories = await this.prisma.category.findMany({
      where: {
        userId: effectiveUserId,
      },
      include: {
        children: true,
        parent: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Auto-seed si el usuario (Admin o Negocio) no tiene categorías aún
    if (categories.length === 0) {
      await this.seedDefaultCategories(effectiveUserId);
      categories = await this.prisma.category.findMany({
        where: {
          userId: effectiveUserId,
        },
        include: {
          children: true,
          parent: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return categories;
  }`;

if (regexFindAll.test(categoryServiceCode)) {
  categoryServiceCode = categoryServiceCode.replace(regexFindAll, replacementFindAll);
  console.log('✅ category.service.ts findAllByUser successfully patched');
  fs.writeFileSync(categoryServicePath, categoryServiceCode, 'utf8');
} else {
  console.log('⚠️ regexFindAll did not match');
}
