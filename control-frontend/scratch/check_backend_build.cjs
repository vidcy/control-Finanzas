const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.resolve('../control-backend');
console.log('Running tsc in backend directory:', backendDir);

try {
  const stdout = execSync('npx tsc --noEmit', { cwd: backendDir, encoding: 'utf8', stdio: 'pipe' });
  console.log('Backend tsc success! No errors:');
  console.log(stdout);
} catch (err) {
  console.error('Backend tsc failed:');
  console.error(err.stdout);
  console.error(err.stderr);
  process.exit(1);
}
