// One-off fix: set show_on_today=false for episode 69256e0a-b50c-4c09-b52e-0b8bee49cd56
//
// Usage: node --env-file=.env.local scripts/fix-show-on-today.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não encontradas.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const EP_ID = '69256e0a-b50c-4c09-b52e-0b8bee49cd56'

async function main() {
  console.log(`Setting show_on_today=false for episode: ${EP_ID}`)

  const { error } = await supabase
    .from('episodes')
    .update({ show_on_today: false })
    .eq('id', EP_ID)

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  // Verify
  const { data, error: verifyError } = await supabase
    .from('episodes')
    .select('id, title, show_on_today, status, editorial_status')
    .eq('id', EP_ID)
    .single()

  if (verifyError) {
    console.error('❌ Verify error:', verifyError.message)
    process.exit(1)
  }

  console.log('')
  console.log('✅ Updated. New values:')
  console.log(`   id: ${data.id}`)
  console.log(`   title: "${data.title}"`)
  console.log(`   show_on_today: ${data.show_on_today}`)
  console.log(`   status: ${data.status}`)
  console.log(`   editorial_status: ${data.editorial_status}`)
}

main()