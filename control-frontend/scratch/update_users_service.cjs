const fs = require('fs');
const path = require('path');

const servicePath = path.resolve(__dirname, '../../control-backend/src/users/users.service.ts');
let content = fs.readFileSync(servicePath, 'utf8');

const target = `'catalogConfig',`;
const replacement = `'catalogConfig',
      'businessAddress',
      'businessPhone',
      'businessEmail',
      'businessDepartment',
      'businessProvince',
      'businessDistrict',
      'billingSerieInvoice',
      'billingSerieBoleta',
      'hasElectronicBilling',`;

if (content.includes(target) && !content.includes('businessAddress')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(servicePath, content, 'utf8');
  console.log('Successfully updated users.service.ts allowedFields');
} else {
  console.log('Already updated or target not found');
}
