const fs = require('fs');
const path = require('path');

// 1. Update users.controller.ts
const controllerPath = path.resolve(__dirname, '../../control-backend/src/users/users.controller.ts');
let controllerCode = fs.readFileSync(controllerPath, 'utf8');

const targetController = `  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/inactive')
  inactiveUserRequest(@Param('id') id: string) {
    return this.usersService.inactiveUserRequest(id);
  }`;

const replacementController = `  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/inactive')
  inactiveUserRequest(@Param('id') id: string) {
    return this.usersService.inactiveUserRequest(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }`;

if (controllerCode.includes('deleteUser(@Param(\'id\') id: string)')) {
  console.log('users.controller.ts already has deleteUser');
} else {
  // Normalize line endings
  controllerCode = controllerCode.replace(/\r\n/g, '\n');
  const normalizedTarget = targetController.replace(/\r\n/g, '\n');
  const normalizedReplacement = replacementController.replace(/\r\n/g, '\n');
  if (controllerCode.includes(normalizedTarget)) {
    controllerCode = controllerCode.replace(normalizedTarget, normalizedReplacement);
    fs.writeFileSync(controllerPath, controllerCode, 'utf8');
    console.log('✅ Added deleteUser endpoint to users.controller.ts');
  } else {
    console.log('⚠️ Could not find target in users.controller.ts');
  }
}

// 2. Update users.service.ts
const servicePath = path.resolve(__dirname, '../../control-backend/src/users/users.service.ts');
let serviceCode = fs.readFileSync(servicePath, 'utf8');

const targetServiceMethod = `  async inactiveUserRequest(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return user;
  }`;

const replacementServiceMethod = `  async inactiveUserRequest(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('No se puede eliminar a un usuario administrador');
    }

    // Cascade cleanup if necessary before deletion
    await this.prisma.category.deleteMany({ where: { userId: id } });
    await this.prisma.product.deleteMany({ where: { userId: id } });
    await this.prisma.branch.deleteMany({ where: { userId: id } });

    return this.prisma.user.delete({
      where: { id },
    });
  }`;

if (serviceCode.includes('async deleteUser(id: string)')) {
  console.log('users.service.ts already has deleteUser');
} else {
  serviceCode = serviceCode.replace(/\r\n/g, '\n');
  const normalizedTargetS = targetServiceMethod.replace(/\r\n/g, '\n');
  const normalizedReplacementS = replacementServiceMethod.replace(/\r\n/g, '\n');
  if (serviceCode.includes(normalizedTargetS)) {
    serviceCode = serviceCode.replace(normalizedTargetS, normalizedReplacementS);
    fs.writeFileSync(servicePath, serviceCode, 'utf8');
    console.log('✅ Added deleteUser method to users.service.ts');
  } else {
    console.log('⚠️ Could not find target in users.service.ts');
  }
}
