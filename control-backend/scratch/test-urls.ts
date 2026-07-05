import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const keyId = 'DO00W7Z3B4LHJV6TLG7Q'; // Cleaned key ID
  const secretKey = process.env.DO_SPACES_SECRET || '';
  const bucketName = 'controlfinanzas';
  const region = 'nyc3';

  const s3Client = new S3Client({
    endpoint: 'https://nyc3.digitaloceanspaces.com',
    region: 'nyc3',
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: secretKey,
    },
  });

  const testKey = `test-public-${Date.now()}.txt`;
  console.log('Uploading test public file:', testKey);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: Buffer.from('Public accessibility test!'),
        ContentType: 'text/plain',
        ACL: 'public-read',
      })
    );
    console.log('Upload success! Checking URLs...\n');

    const urls = [
      { name: '1. Bucket subdomain CDN', url: `https://${bucketName}.${region}.cdn.digitaloceanspaces.com/${testKey}` },
      { name: '2. Bucket path CDN', url: `https://${region}.cdn.digitaloceanspaces.com/${bucketName}/${testKey}` },
      { name: '3. Bucket subdomain Spaces', url: `https://${bucketName}.${region}.digitaloceanspaces.com/${testKey}` },
      { name: '4. Bucket path Spaces', url: `https://${region}.digitaloceanspaces.com/${bucketName}/${testKey}` },
    ];

    for (const item of urls) {
      try {
        console.log(`Checking ${item.name}: ${item.url}`);
        const res = await fetch(item.url);
        if (res.ok) {
          const text = await res.text();
          console.log(`-> SUCCESS (Status ${res.status}): ${text}\n`);
        } else {
          console.log(`-> FAILED (Status ${res.status}): ${res.statusText}\n`);
        }
      } catch (err: any) {
        console.log(`-> FAILED (Error: ${err.message})\n`);
      }
    }
  } catch (err: any) {
    console.error('Upload failed:', err);
  }
}

run();
