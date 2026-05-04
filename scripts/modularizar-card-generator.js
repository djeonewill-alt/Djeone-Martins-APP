const fs = require('fs')
const path = require('path')

const filePath = path.join(
  process.cwd(),
  'app',
  'admin',
  'novo-episodio',
  'page.tsx'
)

let content = fs.readFileSync(filePath, 'utf8')

if (content.includes("from '@/lib/daily-quote-card-generator'")) {
  console.log('O page.tsx já parece estar modularizado. Nenhuma alteração feita.')
  process.exit(0)
}

content = content.replace(
  "import type { DailyQuoteSuggestion } from '@/lib/supabase'",
  "import type { DailyQuoteSuggestion } from '@/lib/supabase'\nimport { CARD_TEMPLATES, dataUrlToBlob, generateCardDataUrl, type CardTemplate } from '@/lib/daily-quote-card-generator'"
)

content = content.replace(
  /type CardTemplate = 'devotional' \| 'modern' \| 'cinematic'\s*/g,
  ''
)

content = content.replace(
  /const CARD_TEMPLATES:[\s\S]*?\n]\s*\nfunction getLocalDateString/,
  'function getLocalDateString'
)

content = content.replace(
  /function loadImage[\s\S]*?\nfunction dataUrlToBlob[\s\S]*?\n}\s*\nexport default function NovoEpisodio/,
  'export default function NovoEpisodio'
)

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ page.tsx modularizado com sucesso.')
console.log('Agora o gerador de cards está em lib/daily-quote-card-generator.ts')