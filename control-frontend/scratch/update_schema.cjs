const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../../control-backend/prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const target = '  businessSlug         String?   @unique';
const replacement = `  businessSlug         String?   @unique
  businessAddress      String?
  businessPhone        String?
  businessEmail        String?
  businessDepartment   String?
  businessProvince     String?
  businessDistrict     String?
  billingSerieInvoice  String?   @default("F001")
  billingSerieBoleta   String?   @default("B001")`;

if (content.includes(target) && !content.includes('businessAddress')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('Successfully updated schema.prisma with businessAddress and fiscal fields');
} else {
  console.log('Target not found or already updated');
}
