#!/usr/bin/env npx tsx
/**
 * Set public read policy on Wasabi bucket
 */

import { S3Client, PutBucketPolicyCommand } from '@aws-sdk/client-s3'

const endpoint = process.env.WASABI_ENDPOINT?.startsWith('https://')
  ? process.env.WASABI_ENDPOINT
  : `https://${process.env.WASABI_ENDPOINT || 's3.us-west-2.wasabisys.com'}`

const bucketName = process.env.WASABI_BUCKET_NAME || process.env.WASABI_BUCKET || 'zona-gol'

const s3Client = new S3Client({
  region: process.env.WASABI_REGION || 'us-west-2',
  endpoint,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID || process.env.WASABI_ACCESS_KEY!,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY || process.env.WASABI_SECRET_KEY!,
  },
  forcePathStyle: true,
})

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${bucketName}/*`,
    },
  ],
}

async function main() {
  console.log(`Setting public read policy on bucket: ${bucketName}`)
  console.log(`Endpoint: ${endpoint}`)

  try {
    await s3Client.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy),
      })
    )
    console.log('✅ Bucket policy set successfully!')
    console.log('\nPolicy applied:')
    console.log(JSON.stringify(policy, null, 2))
  } catch (error) {
    console.error('❌ Failed to set bucket policy:', error)
    process.exit(1)
  }
}

main()
