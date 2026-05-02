import { S3Client } from '@aws-sdk/client-s3'

if (!process.env.R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID não configurado')
if (!process.env.R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID não configurado')
if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY não configurado')

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'djeone-audios'
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''
