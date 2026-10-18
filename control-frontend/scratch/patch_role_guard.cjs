const fs = require('fs');
const path = require('path');

const guardPath = path.resolve(__dirname, '../../control-backend/src/auth/role.guard.ts');
let guardCode = fs.readFileSync(guardPath, 'utf8').replace(/\r\n/g, '\n');

const targetCheck = `    // 3. validamos rol
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos');
    }`;

const replacementCheck = `    // 3. validamos rol (SUPERADMIN tiene acceso total a todos los módulos)
    if (user.role === 'SUPERADMIN') {
      return true;
    }
    const hasRole = requiredRoles.includes(user.role) || (requiredRoles.includes('ADMIN') && user.role === 'SUPERADMIN');

    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos');
    }`;

if (guardCode.includes(targetCheck)) {
  guardCode = guardCode.replace(targetCheck, replacementCheck);
  fs.writeFileSync(guardPath, guardCode, 'utf8');
  console.log('✅ role.guard.ts patched for SUPERADMIN');
} else {
  console.log('⚠️ targetCheck not found in role.guard.ts');
}
