async function test() {
  const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@admin.com', password: '123456' })
  });

  const loginData = await loginRes.json();
  console.log('Login response status:', loginRes.status);
  console.log('Login user payload:', loginData.user);

  if (!loginData.access_token) {
    console.error('No token returned!', loginData);
    return;
  }

  const token = loginData.access_token;

  // Test GET /users
  const getRes = await fetch('http://localhost:3000/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('GET /users status:', getRes.status);
  const getUsersData = await getRes.json();
  console.log('GET /users response:', Array.isArray(getUsersData) ? `Loaded ${getUsersData.length} users` : getUsersData);

  // Test POST /users
  const testEmail = `test_${Date.now()}@negocio.com`;
  const postRes = await fetch('http://localhost:3000/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Empresa Test',
      lastName: 'SAC',
      email: testEmail,
      password: 'Password123!',
      role: 'USER',
      profiles: ['PERSONAL', 'BUSINESS'],
      blockedProfiles: [],
      hasElectronicBilling: true,
      isActive: true
    })
  });
  console.log('POST /users status:', postRes.status);
  const postData = await postRes.json();
  console.log('POST /users response:', postData);
}

test().catch(console.error);
