const axios = require('axios');

async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:3000/auth/login', {
      email: 'trinidadchoque1414@gmail.com',
      password: '123456'
    });
    const token = loginRes.data.access_token;
    console.log('Login successful.');

    // Fetch categories to get a valid categoryId
    console.log('Fetching categories...');
    const catRes = await axios.get('http://localhost:3000/categories', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const categories = catRes.data;
    if (categories.length === 0) {
      console.log('No categories found to run test.');
      return;
    }
    const testCategory = categories[0];
    console.log(`Using category: ${testCategory.name} (ID: ${testCategory.id})`);

    // 1. Get products
    console.log('Fetching products...');
    const productsRes = await axios.get('http://localhost:3000/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const products = productsRes.data;
    if (products.length === 0) {
      console.log('No products found to run test.');
      return;
    }
    const testProduct = products[0];
    console.log(`Using product: ${testProduct.name} (ID: ${testProduct.id}), Current Stock: ${testProduct.stock}`);

    // 2. Create a purchase order
    console.log('Creating purchase order...');
    const orderPayload = {
      paymentMethod: 'CASH',
      categoryId: testCategory.id,
      totalCost: 156 * 5,
      items: [
        {
          productId: testProduct.id,
          quantity: 5,
          costPrice: 156,
          equivalence: 1.0,
          presentationName: 'Unidad'
        }
      ],
      receiveImmediately: false
    };

    const createRes = await axios.post('http://localhost:3000/products/purchase-orders', orderPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const order = createRes.data;
    console.log(`Purchase Order created with ID: ${order.id}, Status: ${order.status}`);

    // 3. Receive the purchase order (Pasar a Stock)
    console.log('Receiving purchase order...');
    await axios.post(`http://localhost:3000/products/purchase-orders/${order.id}/receive`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Check product stock after receive
    const prodAfterRes = await axios.get('http://localhost:3000/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const testProductAfter = prodAfterRes.data.find(p => p.id === testProduct.id);
    console.log(`After Receiving - Stock: ${testProductAfter.stock} (Expected: ${testProduct.stock + 5})`);

    // 4. Revert the purchase order
    console.log('Reverting purchase order...');
    await axios.post(`http://localhost:3000/products/purchase-orders/${order.id}/revert`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Check product stock after revert
    const prodFinalRes = await axios.get('http://localhost:3000/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const testProductFinal = prodFinalRes.data.find(p => p.id === testProduct.id);
    console.log(`After Reverting - Stock: ${testProductFinal.stock} (Expected: ${testProduct.stock})`);

    // Cleanup: delete the purchase order
    console.log('Cleaning up purchase order...');
    await axios.delete(`http://localhost:3000/products/purchase-orders/${order.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Done.');

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
