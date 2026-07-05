import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function tryUpload(keyId: string, secretKey: string) {
  console.log(`\n--- Trying with Key ID: "${keyId}" ---`);
  
  const s3Client = new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT,
    region: 'nyc3', // Try region nyc3 instead of us-east-1
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: secretKey,
    },
  });

  try {
    const key = `test-${Date.now()}.txt`;
    console.log('Uploading test file with key:', key);
    const res = await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: key,
        Body: Buffer.from('Hello DigitalOcean Spaces!'),
        ContentType: 'text/plain',
        ACL: 'public-read',
      })
    );
    console.log('Upload success!', res);
    return true;
  } catch (err: any) {
    console.error('Upload failed with error:', err.name || err.message, err);
    return false;
  }
}

async function run() {
  const originalKey = process.env.DO_SPACES_KEY || '';
  const secret = process.env.DO_SPACES_SECRET || '';

  // Try 1: Original
  await tryUpload(originalKey, secret);

  // Try 2: Remove leading 't' if it starts with 'tDO'
  if (originalKey.startsWith('tDO')) {
    const cleanedKey = originalKey.substring(1);
    await tryUpload(cleanedKey, secret);
  }
}

run();
