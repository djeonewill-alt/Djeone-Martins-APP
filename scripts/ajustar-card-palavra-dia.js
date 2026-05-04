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

const replacements = [
  {
    name: 'Devocional elegante - centralizar frase',
    from: `const lineHeight = 78
    const startY = 330 - Math.min(lines.length, 6) * 20`,
    to: `const lineHeight = 72
    const visibleLines = Math.min(lines.length, 6)
    const quoteAreaTop = 245
    const quoteAreaBottom = 735
    const quoteAreaCenter = (quoteAreaTop + quoteAreaBottom) / 2
    const textBlockHeight = (visibleLines - 1) * lineHeight
    const startY = quoteAreaCenter - textBlockHeight / 2`,
  },
  {
    name: 'Devocional elegante - referência mais equilibrada',
    from: `ctx.fillText(params.bibleReference || 'Devocional', size / 2, 820)

    ctx.font = '400 26px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.76)'
    ctx.fillText('Pr. Djeone Martins', size / 2, 875)`,
    to: `ctx.fillText(params.bibleReference || 'Devocional', size / 2, 805)

    ctx.font = '400 26px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.76)'
    ctx.fillText('Pr. Djeone Martins', size / 2, 858)`,
  },
  {
    name: 'Moderno premium - centralizar frase',
    from: `drawMultilineText({
      ctx,
      lines,
      x: left,
      y: 310,
      lineHeight: 68,
      align: 'left',
      maxLines: 7,
    })`,
    to: `const visibleLines = Math.min(lines.length, 7)
    const quoteAreaTop = 245
    const quoteAreaBottom = 720
    const quoteAreaCenter = (quoteAreaTop + quoteAreaBottom) / 2
    const lineHeight = 66
    const textBlockHeight = (visibleLines - 1) * lineHeight
    const startY = quoteAreaCenter - textBlockHeight / 2

    drawMultilineText({
      ctx,
      lines,
      x: left,
      y: startY,
      lineHeight,
      align: 'left',
      maxLines: 7,
    })`,
  },
  {
    name: 'Moderno premium - referência mais equilibrada',
    from: `ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fillRect(left, 790, 320, 3)

    ctx.fillStyle = '#bfdbfe'
    ctx.font = '700 34px Arial, sans-serif'
    ctx.fillText(params.bibleReference || 'Devocional', left, 850)

    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = '400 25px Arial, sans-serif'
    ctx.fillText('Pr. Djeone Martins', left, 905)`,
    to: `ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fillRect(left, 770, 320, 3)

    ctx.fillStyle = '#bfdbfe'
    ctx.font = '700 34px Arial, sans-serif'
    ctx.fillText(params.bibleReference || 'Devocional', left, 825)

    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = '400 25px Arial, sans-serif'
    ctx.fillText('Pr. Djeone Martins', left, 878)`,
  },
  {
    name: 'Cinematográfico - centralizar frase',
    from: `drawMultilineText({
      ctx,
      lines,
      x: size / 2,
      y: 330,
      lineHeight: 70,
      align: 'center',
      maxLines: 6,
    })`,
    to: `const visibleLines = Math.min(lines.length, 6)
    const quoteAreaTop = 245
    const quoteAreaBottom = 720
    const quoteAreaCenter = (quoteAreaTop + quoteAreaBottom) / 2
    const lineHeight = 68
    const textBlockHeight = (visibleLines - 1) * lineHeight
    const startY = quoteAreaCenter - textBlockHeight / 2

    drawMultilineText({
      ctx,
      lines,
      x: size / 2,
      y: startY,
      lineHeight,
      align: 'center',
      maxLines: 6,
    })`,
  },
  {
    name: 'Cinematográfico - referência mais equilibrada',
    from: `ctx.fillStyle = 'rgba(255,255,255,0.20)'
    ctx.fillRect(240, 780, 600, 3)

    ctx.fillStyle = '#fde68a'
    ctx.font = '800 34px Arial, sans-serif'
    ctx.fillText(params.bibleReference || 'Devocional', size / 2, 840)

    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = '400 26px Arial, sans-serif'
    ctx.fillText('Pr. Djeone Martins', size / 2, 900)`,
    to: `ctx.fillStyle = 'rgba(255,255,255,0.20)'
    ctx.fillRect(240, 770, 600, 3)

    ctx.fillStyle = '#fde68a'
    ctx.font = '800 34px Arial, sans-serif'
    ctx.fillText(params.bibleReference || 'Devocional', size / 2, 825)

    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = '400 26px Arial, sans-serif'
    ctx.fillText('Pr. Djeone Martins', size / 2, 878)`,
  },
]

const missing = []

for (const replacement of replacements) {
  if (!content.includes(replacement.from)) {
    missing.push(replacement.name)
    continue
  }

  content = content.replace(replacement.from, replacement.to)
}

if (missing.length > 0) {
  console.error('Não consegui aplicar estes ajustes:')
  missing.forEach((item) => console.error(`- ${item}`))
  console.error('\nO arquivo pode estar diferente do esperado.')
  process.exit(1)
}

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Ajuste aplicado com sucesso!')
console.log('A frase agora ficará mais centralizada entre "PALAVRA DO DIA" e a referência bíblica.')