#!/usr/bin/env npx tsx
/**
 * Check and fix bucket public access configuration
 */

import {
  S3Client,
  GetBucketPolicyCommand,
  GetPublicAccessBlockCommand,
  DeletePublicAccessBlockCommand,
  GetBucketAclCommand,
  PutBucketAclCommand
} from '@aws-sdk/client-s3'

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

async function main() {
  console.log(`Checking bucket: ${bucketName}`)
  console.log(`Endpoint: ${endpoint}\n`)

  // Check current policy
  try {
    const policy = await s3Client.send(new GetBucketPolicyCommand({ Bucket: bucketName }))
    console.log('📋 Current Policy:')
    console.log(policy.Policy)
  } catch (e: any) {
    console.log('📋 Policy:', e.Code || e.message)
  }

  // Check Public Access Block
  try {
    const pab = await s3Client.send(new GetPublicAccessBlockCommand({ Bucket: bucketName }))
    console.log('\n🔒 Public Access Block:')
    console.log(JSON.stringify(pab.PublicAccessBlockConfiguration, null, 2))

    // If any are true, remove the block
    const config = pab.PublicAccessBlockConfiguration
    if (config?.BlockPublicAcls || config?.BlockPublicPolicy || config?.IgnorePublicAcls || config?.RestrictPublicBuckets) {
      console.log('\n⚠️  Public access is blocked. Removing block...')
      await s3Client.send(new DeletePublicAccessBlockCommand({ Bucket: bucketName }))
      console.log('✅ Public access block removed!')
    }
  } catch (e: any) {
    console.log('\n🔒 Public Access Block:', e.Code || e.message)
  }

  // Check ACL
  try {
    const acl = await s3Client.send(new GetBucketAclCommand({ Bucket: bucketName }))
    console.log('\n📑 Bucket ACL:')
    console.log(JSON.stringify(acl.Grants, null, 2))
  } catch (e: any) {
    console.log('\n📑 ACL:', e.Code || e.message)
  }

  // Try setting bucket to public-read
  console.log('\n🔧 Setting bucket ACL to public-read...')
  try {
    await s3Client.send(new PutBucketAclCommand({
      Bucket: bucketName,
      ACL: 'public-read'
    }))
    console.log('✅ Bucket ACL set to public-read!')
  } catch (e: any) {
    console.log('❌ Failed:', e.Code || e.message)
  }
}

main().catch(console.error)
