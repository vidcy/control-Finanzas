const axios = require('axios');

async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:3000/auth/login', {
      email: 'trinidadchoque1414@gmail.com',
      password: '123456'
    });
    const token = loginRes.data.access_token;
    console.log('Login successful, token retrieved.');

    console.log('Fetching categories...');
    const catRes = await axios.get('http://localhost:3000/categories', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Success! Number of categories fetched:', catRes.data.length);
    console.log('Sample category:', catRes.data[0]);
  } catch (error) {
    console.error('Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

test();
