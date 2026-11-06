const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://hdvyfeolbxgepneavuiv.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY. Run:')
  console.error('  SUPABASE_SERVICE_KEY=your-key node insert.js')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function seed() {
  const filePath = path.join(__dirname, 'sample_batch.json')
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  console.log(`Inserting ${questions.length} questions...`)

  const { data, error } = await supabase
    .from('questions')
    .insert(questions)
    .select('id')

  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log(`Done. Inserted ${data.length} questions.`)
}

seed()
