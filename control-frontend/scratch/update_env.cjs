const fs = require('fs');
const path = require('path');

const envPath = path.resolve('../control-backend/.env');
let env = fs.readFileSync(envPath, 'utf8');

const oldUrl = 'DATABASE_URL="postgresql://postgres:vidcy@localhost:5432/control_finanzas?schema=public"';
const newUrl = 'DATABASE_URL="postgresql://postgres:vidcy@localhost:5432/control_finanzas?schema=public&connection_limit=40&pool_timeout=30"';

if (env.includes(oldUrl)) {
  env = env.replace(oldUrl, newUrl);
  fs.writeFileSync(envPath, env, 'utf8');
  console.log('Updated DATABASE_URL with connection_limit=40&pool_timeout=30');
} else {
  console.log('DATABASE_URL already updated or different:', env.split('\n').filter(l => l.includes('DATABASE_URL')));
}
