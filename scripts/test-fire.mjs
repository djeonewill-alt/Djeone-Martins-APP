// TESTE DE FOGO: Geração de prompt com APENAS a selectedQuote.
// Sem transcrição, sem contexto bíblico, sem referência, sem título.
// Apenas a frase.
// Uso: node --env-file=.env.local scripts/test-fire.mjs

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')

if (!DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY ausente')
  process.exit(1)
}

// ── Função de sanitização (cópia do ImageOrchestrator) ──

function sanitizeContextWords(text) {
  const replacements = [
    [/\bbarco\b/gi, 'vida'],
    [/\bnavio\b/gi, 'caminho'],
    [/\bmar\b/gi, 'caminho'],
    [/\bPaulo\b/g, 'uma pessoa'],
    [/\bpaulo\b/g, 'uma pessoa'],
    [/\bnaufragar\b/gi, 'prosseguir'],
    [/\bnaufrágio\b/gi, 'jornada'],
    [/\btempestade\b/gi, 'desafio'],
    [/\bondas?\b/gi, 'momentos'],
    [/\bpraia\b/gi, 'destino'],
    [/\bdeserto\b/gi, 'caminho'],
    [/\bmultidão\b/gi, 'pessoas'],
    [/\bmultidoes\b/gi, 'pessoas'],
    [/\bcenturião\b/gi, 'alguém'],
    [/\bcenturiao\b/gi, 'alguém'],
    [/\bsoldados?\b/gi, 'pessoas'],
    [/\bprisioneiros?\b/gi, 'pessoas'],
    [/\bJerusalém\b/gi, 'um lugar'],
    [/\bjerusalem\b/gi, 'um lugar'],
    [/\bBetânia\b/gi, 'um lugar'],
    [/\bbetania\b/gi, 'um lugar'],
    [/\bAtos 27\b/gi, 'um texto'],
    [/\batos 27\b/gi, 'um texto'],
    [/\bPedro\b/g, 'alguém'],
    [/\bpedro\b/g, 'alguém'],
    [/\bDavi\b/g, 'alguém'],
    [/\bdavi\b/g, 'alguém'],
    [/\bMoisés\b/g, 'alguém'],
    [/\bmoises\b/g, 'alguém'],
    [/\bAbraão\b/g, 'alguém'],
    [/\babraao\b/g, 'alguém'],
    [/\bLázaro\b/g, 'alguém'],
    [/\blazaro\b/g, 'alguém'],
    [/\bMarta\b/g, 'alguém'],
    [/\bmarta\b/g, 'alguém'],
    [/\bMaria\b/g, 'alguém'],
    [/\bmaria\b/g, 'alguém'],
  ]
  let result = text
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }
  return result
}

// ── System prompt (cópia exata do ImageOrchestrator) ──

const SYSTEM_PROMPT = [
  'SYSTEM PROMPT — GERADOR DE PROMPTS PARA FLUX (PALAVRA DO DIA)',
  '',
  'PERSONA:',
  'Você é um Diretor de Fotografia de Cinema Épico especializado em arte conceitual para',
  'aplicativos devocionais premium. Sua missão é transformar a frase escolhida do dia,',
  'chamada selectedQuote, em um prompt visual abstrato e emocional para o modelo FLUX.',
  '',
  'REGRA DE PRIORIDADE ABSOLUTA:',
  'A frase escolhida (selectedQuote) é o ÚNICO elemento que importa. A imagem inteira',
  'deve ser construída para refletir visualmente a emoção e a mensagem dessa frase.',
  '',
  'PROIBIÇÃO TÉCNICA E ABSOLUTA:',
  'Proibido gerar navios, fogo, praias, desertos ou personagens históricos específicos.',
  'Se a frase for bíblica, abstraia o conceito para emoção, luz e sombra.',
  'Nenhuma cena bíblica narrativa pode ser o foco principal da imagem.',
  '',
  'DIAGNÓSTICO INTERNO (obrigatório antes de escrever):',
  '1. Qual é a emoção central da frase? (libertação, paz, encorajamento, fé, força)',
  '2. O que essa frase quer provocar em quem lê? (esperança, coragem, alívio)',
  '3. Qual metáfora visual ABSTRATA representa melhor essa emoção?',
  '4. Como usar luz, sombra e textura para transmitir isso sem objetos narrativos?',
  '',
  'DIRETRIZES DE COMPOSIÇÃO:',
  '- Prefira close-ups emocionais, texturas abstratas, jogos de luz e sombra',
  '- Use "volumetric light", "god rays", "chiaroscuro", "shallow depth of field"',
  '- A imagem deve transmitir a emoção da frase MESMO SEM TEXTO VISÍVEL',
  '- Estilo: "Shot on 35mm film, anamorphic lens, cinematic color grading, photorealistic, 8k"',
  '- Proibido: texto, letras, palavras, tipografia, overlays na imagem',
  '',
  'REGRA FINAL:',
  'Se a pessoa olhar para a imagem sem ler o texto e sentir a mesma emoção da frase,',
  'o prompt foi bem-sucedido. Se a imagem parecer uma ilustração de história bíblica,',
  'o prompt falhou.',
  '',
  'Escreva o prompt em INGLÊS. Retorne APENAS um objeto JSON.',
].join('\n')

// ── Frases de teste ──

const TEST_PHRASES = [
  // Frase do usuário (a que estava gerando cenas de barco/Paulo)
  "As pessoas podem rotular você, mas só Deus sabe quem você é de verdade. Não permita que calúnias definam seu valor.",
  // Frase com potencial contaminação bíblica
  "O mesmo Deus que acalmou a tempestade no mar é o que acalma o seu coração.",
  // Frase neutra
  "Feche os ouvidos para as críticas e abra o coração para a voz de Deus.",
]

async function testPhrase(index, originalPhrase) {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`TESTE ${index + 1}`)
  console.log(`${'═'.repeat(70)}`)
  console.log(`Frase original:  "${originalPhrase}"`)

  const sanitized = sanitizeContextWords(originalPhrase)
  if (sanitized !== originalPhrase) {
    console.log(`Frase sanitizada: "${sanitized}"`)
  }

  const userPrompt = [
    'PALAVRA DO DIA (selectedQuote — ÚNICO FOCO DA IMAGEM):',
    `"${sanitized}"`,
    '',
    'IMPORTANTE: Você NÃO tem acesso a nenhuma transcrição, contexto bíblico, título ou referência.',
    'Use APENAS a frase acima como inspiração. Gere uma imagem abstrata e emocional.',
    '',
    'Return JSON: { "flux_visual_prompt": "English abstract emotional scene description — foco total na emoção da frase" }',
  ].join('\n')

  const startTime = Date.now()

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 2048,
      }),
    })

    const data = await response.json()
    const durationMs = Date.now() - startTime

    if (!response.ok) {
      console.error('Erro:', JSON.stringify(data, null, 2))
      return
    }

    const rawContent = data?.choices?.[0]?.message?.content
    if (!rawContent) { console.error('Sem conteúdo.'); return }

    let parsed = null
    try { parsed = JSON.parse(rawContent.trim()) } catch {
      const match = rawContent.trim().match(/\{[\s\S]*\}/)
      if (match) try { parsed = JSON.parse(match[0]) } catch {}
    }

    if (!parsed) {
      console.log('JSON malformado. RAW:')
      console.log(rawContent.slice(0, 500))
      return
    }

    const prompt = (parsed.flux_visual_prompt || '').trim()
    const lowerPrompt = prompt.toLowerCase()

    // Validação de segurança (mesma do ImageOrchestrator)
    const forbiddenPatterns = [
      { regex: /\b(shipwreck|roman ship|mediterranean|shoreline|beach|coast)\b/i, label: 'praia/navio' },
      { regex: /\b(centurion|soldiers?|prisoners?)\b/i, label: 'personagens militares' },
      { regex: /\b(paul|peter|david|moses|abraham|lazarus|mary|martha)\b/i, label: 'personagens bíblicos' },
      { regex: /\b(acts 27|sea journey|dry land|swimming)\b/i, label: 'narrativa bíblica' },
      { regex: /\b(crowd|multitude|mob|throng|desert|sand dune)\b/i, label: 'multidão/deserto' },
    ]

    const violations = []
    for (const { regex, label } of forbiddenPatterns) {
      if (regex.test(lowerPrompt)) {
        violations.push(label)
      }
    }

    const hasAbstract = /\b(abstract|volumetric|ray|texture|chiaroscuro|intimate|atmospheric|emotional|close.?up)\b/i.test(lowerPrompt)

    console.log(`\n⏱️  ${durationMs}ms | tokens: ${data?.usage?.total_tokens || '?'}`)
    console.log(`\n--- RESULTADO ---`)
    console.log(`Violações:  ${violations.length > 0 ? '❌ ' + violations.join(', ') : '✅ NENHUMA'}`)
    console.log(`Abstrato:   ${hasAbstract ? '✅ PRESENTE' : '⚠️ AUSENTE'}`)
    console.log(`\n--- FLUX VISUAL PROMPT ---`)
    console.log(prompt)

  } catch (error) {
    console.error('Erro:', error.message)
  }
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════')
  console.log('TESTE DE FOGO — APENAS selectedQuote (sem transcrição/contexto)')
  console.log('══════════════════════════════════════════════════════════════')

  for (let i = 0; i < TEST_PHRASES.length; i++) {
    await testPhrase(i, TEST_PHRASES[i])
  }

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('TESTE DE FOGO CONCLUÍDO')
  console.log('══════════════════════════════════════════════════════════════')
}

main()