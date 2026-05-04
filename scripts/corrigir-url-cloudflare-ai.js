const fs = require('fs')
const path = require('path')

const filePath = path.join(
  process.cwd(),
  'app',
  'api',
  'ai',
  'generate-daily-quote',
  'route.ts'
)

let content = fs.readFileSync(filePath, 'utf8')

const oldText =
  '`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`'

const newText =
  '`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`'

if (!content.includes(oldText)) {
  console.error('❌ Não encontrei a URL antiga com encodeURIComponent(model).')
  console.error('Talvez o arquivo já tenha sido corrigido ou esteja diferente.')
  process.exit(1)
}

content = content.replace(oldText, newText)

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ URL da Cloudflare AI corrigida com sucesso.')
console.log('Agora o model será enviado no caminho original, sem encodeURIComponent.')