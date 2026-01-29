#!/usr/bin/env node

/**
 * Storage Bucket Setup Script
 * This script creates the necessary storage buckets in Supabase
 * Run this once to enable document uploads
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupStorageBuckets() {
  console.log('🚀 Setting up storage buckets...\n')

  const buckets = [
    { name: 'documents', public: true, description: 'Project documents (job descriptions, interview guides)' },
    { name: 'client-logos', public: true, description: 'Client company logos' },
    { name: 'recruiter-files', public: false, description: 'Private recruiter files' }
  ]

  for (const bucket of buckets) {
    console.log(`Creating bucket: ${bucket.name} (${bucket.public ? 'public' : 'private'})`)

    try {
      // Check if bucket already exists
      const { data: existingBuckets } = await supabase.storage.listBuckets()
      const exists = existingBuckets?.some(b => b.name === bucket.name)

      if (exists) {
        console.log(`  ✓ Bucket '${bucket.name}' already exists\n`)
        continue
      }

      // Create the bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: null
      })

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ✓ Bucket '${bucket.name}' already exists\n`)
        } else {
          console.error(`  ❌ Error creating bucket '${bucket.name}':`, error.message)
        }
      } else {
        console.log(`  ✅ Created bucket '${bucket.name}'\n`)
      }
    } catch (err) {
      console.error(`  ❌ Unexpected error with bucket '${bucket.name}':`, err.message)
    }
  }

  console.log('✨ Storage setup complete!')
  console.log('\n📝 Note: You may need to configure storage policies in the Supabase dashboard')
  console.log('   Go to: https://irfrhwtraxaepabpwdcu.supabase.co/project/_/storage/policies')
}

setupStorageBuckets().catch(console.error)
