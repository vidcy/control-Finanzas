const http = require('http');
const path = require('path');
const jwt = require(path.resolve(__dirname, '../../control-backend/node_modules/jsonwebtoken'));

const payload = {
  sub: 'a75220ef-b71e-42a5-937f-c8416049ef08',
  email: 'admin@admin.com',
  role: 'SUPERADMIN'
};

const token = jwt.sign(payload, 'supersecret', { expiresIn: '1h' });

const profileData = JSON.stringify({
  businessRuc: null
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/users/me/profile',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(profileData),
    'Authorization': `Bearer ${token}`
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Update profile response status with null RUC:', res.statusCode);
  });
});

req.write(profileData);
req.end();
