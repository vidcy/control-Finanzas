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
    console.log(`Using product: ${testProduct.name} (ID: ${testProduct.id}), Current Stock: ${testProduct.stock}, CostPrice (CPP): ${testProduct.costPrice}`);

    // 2. Create a purchase order
    console.log('\n--- 1. Creating Pending Purchase Order ---');
    const orderPayload = {
      paymentMethod: 'CASH',
      categoryId: testCategory.id,
      totalCost: 100 * 5,
      items: [
        {
          productId: testProduct.id,
          quantity: 5,
          costPrice: 100,
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

    // 3. Edit the pending purchase order
    console.log('\n--- 2. Editing Pending Purchase Order (Qty 5 @ 100 -> Qty 10 @ 120) ---');
    const editPayload = {
      paymentMethod: 'TRANSFER',
      categoryId: testCategory.id,
      totalCost: 120 * 10,
      items: [
        {
          productId: testProduct.id,
          quantity: 10,
          costPrice: 120,
          equivalence: 1.0,
          presentationName: 'Unidad'
        }
      ]
    };

    const editRes = await axios.patch(`http://localhost:3000/products/purchase-orders/${order.id}`, editPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Purchase Order edited. Total Cost: ${editRes.data.totalCost}, Payment Method: ${editRes.data.paymentMethod}`);

    // 4. Receive the purchase order (Pasar a Stock)
    console.log('\n--- 3. Receiving Purchase Order (Pasar a Stock) ---');
    await axios.post(`http://localhost:3000/products/purchase-orders/${order.id}/receive`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Check product stock after receive
    const prodAfterRes = await axios.get('http://localhost:3000/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const testProductAfter = prodAfterRes.data.find(p => p.id === testProduct.id);
    console.log(`After Receiving - Stock: ${testProductAfter.stock} (Expected: ${testProduct.stock + 10})`);
    console.log(`After Receiving - CostPrice (CPP): ${testProductAfter.costPrice}`);

    // 5. Edit the received purchase order (reverts stock/CPP, updates, and re-applies)
    console.log('\n--- 4. Editing Received Purchase Order (Qty 10 @ 120 -> Qty 2 @ 150) ---');
    const editReceivedPayload = {
      paymentMethod: 'TRANSFER',
      categoryId: testCategory.id,
      totalCost: 150 * 2,
      items: [
        {
          productId: testProduct.id,
          quantity: 2,
          costPrice: 150,
          equivalence: 1.0,
          presentationName: 'Unidad'
        }
      ]
    };

    const editReceivedRes = await axios.patch(`http://localhost:3000/products/purchase-orders/${order.id}`, editReceivedPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Received Purchase Order edited. Total Cost: ${editReceivedRes.data.totalCost}`);

    // Check product stock after edit on received order
    const prodAfterEditRes = await axios.get('http://localhost:3000/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const testProductAfterEdit = prodAfterEditRes.data.find(p => p.id === testProduct.id);
    console.log(`After Editing Received - Stock: ${testProductAfterEdit.stock} (Expected: ${testProduct.stock + 2})`);
    console.log(`After Editing Received - CostPrice (CPP): ${testProductAfterEdit.costPrice}`);

    // 6. Revert the purchase order to PENDING and verify stock and CPP
    console.log('\n--- 5. Reverting Purchase Order back to Pending ---');
    await axios.post(`http://localhost:3000/products/purchase-orders/${order.id}/revert`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Check product stock after revert
    const prodFinalRes = await axios.get('http://localhost:3000/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const testProductFinal = prodFinalRes.data.find(p => p.id === testProduct.id);
    console.log(`After Reverting - Stock: ${testProductFinal.stock} (Expected: ${testProduct.stock})`);
    console.log(`After Reverting - CostPrice (CPP): ${testProductFinal.costPrice} (Expected: ${testProduct.costPrice})`);

    // Cleanup: delete the purchase order
    console.log('\n--- 6. Cleaning Up (Deleting Purchase Order) ---');
    await axios.delete(`http://localhost:3000/products/purchase-orders/${order.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Cleanup Done. Test passed successfully.');

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
