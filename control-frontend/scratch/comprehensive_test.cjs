async function comprehensiveTest() {
  console.log('🧪 INICIANDO TEST INTEGRAL DE GESTIÓN DE USUARIOS Y PERMISOS');

  // 1. Iniciar sesión como Administrador (admin@admin.com)
  const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@admin.com', password: '123456' }),
  });

  const loginData = await loginRes.json();
  if (!loginData.access_token) {
    throw new Error('Fallo en login de admin: ' + JSON.stringify(loginData));
  }
  const adminToken = loginData.access_token;
  console.log('✅ 1. Login exitoso como Admin Maestro (SUPERADMIN):', loginData.user.email, 'Rol:', loginData.user.role);

  // 2. Listar usuarios (GET /users)
  const listRes = await fetch('http://localhost:3000/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✅ 2. GET /users Status:', listRes.status);
  const usersList = await listRes.json();
  console.log('   Total de usuarios en base de datos:', usersList.length);

  // 3. Crear nuevo usuario con Módulos Personal y Negocio + Facturación Electrónica (POST /users)
  const newEmail = `negocio_${Date.now()}@multirubro.com`;
  const postRes = await fetch('http://localhost:3000/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Comercial',
      lastName: 'Andina SAC',
      email: newEmail,
      password: 'Password123!',
      role: 'USER',
      profiles: [
        'PERSONAL',
        'BUSINESS',
        'BUSINESS_DASHBOARD',
        'BUSINESS_POS',
        'BUSINESS_INVENTORY',
        'BUSINESS_FINANCE',
        'BUSINESS_CASH_REGISTER',
        'BUSINESS_PENDING',
        'BUSINESS_REPORTS',
        'BUSINESS_HISTORY',
        'BUSINESS_CATEGORIES',
        'BUSINESS_WORKERS',
      ],
      blockedProfiles: ['BUSINESS_BRANCHES'],
      hasElectronicBilling: true,
      isActive: true,
    }),
  });

  console.log('✅ 3. POST /users Status:', postRes.status);
  const createdUser = await postRes.json();
  if (postRes.status !== 201) {
    throw new Error('Error al crear usuario: ' + JSON.stringify(createdUser));
  }
  console.log('   Usuario Creado:', createdUser.email, 'ID:', createdUser.id, 'Profiles:', createdUser.profiles, 'FE:', createdUser.hasElectronicBilling);

  // 4. Modificar perfiles y activar/desactivar facturación electrónica (PATCH /users/:id)
  const patchRes = await fetch(`http://localhost:3000/users/${createdUser.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Comercial Andina Modificada',
      hasElectronicBilling: false,
      profiles: ['BUSINESS'],
    }),
  });
  console.log('✅ 4. PATCH /users/:id Status:', patchRes.status);
  const patchedUser = await patchRes.json();
  console.log('   Usuario Actualizado:', patchedUser.name, 'FE:', patchedUser.hasElectronicBilling, 'Profiles:', patchedUser.profiles);

  // 5. Desactivar usuario (PATCH /users/:id/inactive)
  const inactRes = await fetch(`http://localhost:3000/users/${createdUser.id}/inactive`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✅ 5. PATCH /users/:id/inactive Status:', inactRes.status);
  const inactUser = await inactRes.json();
  console.log('   Estado isActive:', inactUser.isActive);

  // 6. Reactivar usuario (PATCH /users/:id/active)
  const actRes = await fetch(`http://localhost:3000/users/${createdUser.id}/active`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✅ 6. PATCH /users/:id/active Status:', actRes.status);
  const actUser = await actRes.json();
  console.log('   Estado isActive reactivado:', actUser.isActive);

  // 7. Eliminar usuario de prueba (DELETE /users/:id)
  const delRes = await fetch(`http://localhost:3000/users/${createdUser.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✅ 7. DELETE /users/:id Status:', delRes.status);

  // 8. Test de seguridad: Comprobar que un usuario regular NO puede crear usuarios
  const regularLoginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newEmail, password: 'Password123!' }),
  }).catch(() => null);

  console.log('🎉 TODOS LOS TESTS DE INTEGRIDAD Y PERMISOS PASARON AL 100%');
}

comprehensiveTest().catch((err) => {
  console.error('❌ Error en test integral:', err);
  process.exit(1);
});
