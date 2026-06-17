/**
 * Fal.ai Provider — Integração com FLUX Schnell para geração de imagens
 *
 * AI-MEDIA-001: Criação do serviço de integração com Fal.ai
 * Modelo: fal-ai/flux/schnell (rápido, barato, texto nativo na imagem)
 *
 * Fluxo:
 * 1. Recebe um prompt completo (full_prompt_with_text do DeepSeek)
 * 2. Chama Fal.ai API para gerar a imagem
 * 3. Faz download do resultado
 * 4. Comprime para WebP (alvo 50-80 KB) via sharp
 * 5. Faz upload para R2
 * 6. Retorna a URL pública da imagem
 */

import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2/client'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface FalGenerateParams {
  prompt: string
  imageSize?:
    | 'square_hd'
    | 'square'
    | 'portrait_4_3'
    | 'portrait_16_9'
    | 'landscape_4_3'
    | 'landscape_16_9'
  numImages?: number
  seed?: number
  enableSafetyChecker?: boolean
}

export interface FalGenerateResult {
  url: string
  contentType: string
  width: number
  height: number
}

export interface FalUploadResult {
  /** URL pública final da imagem no R2 */
  r2Url: string
  /** Chave do objeto no bucket R2 */
  r2Key: string
  /** Tamanho final do arquivo comprimido em bytes */
  sizeBytes: number
  /** Dimensões finais da imagem */
  width: number
  height: number
  /** URL original do Fal.ai (efêmera — pode expirar) */
  falUrl: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FAL_BASE_URL = 'https://fal.run'

function getApiKey(): string {
  const key = process.env.FAL_KEY

  if (!key) {
    throw new Error(
      'FAL_KEY ausente. Configure no .env.local para usar o Fal.ai (FLUX Schnell).'
    )
  }

  return key
}

function getR2Prefix(): string {
  return process.env.R2_IMAGE_PREFIX || 'images'
}

function getWebpQuality(): number {
  const raw = Number(process.env.WEBP_QUALITY)
  return Number.isFinite(raw) && raw >= 30 && raw <= 90 ? raw : 62
}

function getWebpTargetSizeBytes(): number {
  // Alvo entre 50 KB e 80 KB conforme especificação
  return 70 * 1024
}

// ---------------------------------------------------------------------------
// Cliente Fal.ai
// ---------------------------------------------------------------------------

/**
 * Chama a API do Fal.ai para gerar imagem via FLUX Schnell.
 *
 * Endpoint: POST https://fal.run/fal-ai/flux/schnell
 * Docs: https://fal.ai/models/fal-ai/flux/schnell
 */
export async function generateWithFlux(
  params: FalGenerateParams
): Promise<FalGenerateResult> {
  const apiKey = getApiKey()
  const imageSize = params.imageSize || 'landscape_16_9'
  const numImages = params.numImages || 1

  const startTime = Date.now()

  const response = await fetch(`${FAL_BASE_URL}/fal-ai/flux/schnell`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: params.prompt,
      image_size: imageSize,
      num_images: numImages,
      seed: params.seed,
      enable_safety_checker: params.enableSafetyChecker ?? false,
    }),
  })

  const durationMs = Date.now() - startTime
  const data = await response.json()

  if (!response.ok) {
    const errorMessage =
      data?.detail || data?.error || `Erro HTTP ${response.status}`

    console.error(
      `[FAL] Erro na geração | status=${response.status} | duration=${durationMs}ms | error=${errorMessage}`
    )

    if (response.status === 401) {
      throw new Error('Fal.ai: chave de API inválida (401). Verifique FAL_KEY.')
    }

    if (response.status === 429) {
      throw new Error(
        'Fal.ai: limite de requisições excedido (429). Aguarde alguns segundos e tente novamente.'
      )
    }

    throw new Error(`Fal.ai: ${errorMessage}`)
  }

  // A resposta do Fal.ai pode vir em dois formatos:
  // 1. { images: [{ url, content_type, width, height }] }
  // 2. { image: { url, content_type, width, height } } (single image)
  const images = data?.images || (data?.image ? [data.image] : [])

  if (!images.length) {
    console.error(
      '[FAL] Resposta sem imagens | data=',
      JSON.stringify(data).slice(0, 500)
    )
    throw new Error('Fal.ai não retornou nenhuma imagem.')
  }

  const image = images[0]

  if (!image?.url) {
    throw new Error('Fal.ai retornou uma imagem sem URL.')
  }

  console.log(
    `[FAL] Imagem gerada | duration=${durationMs}ms | size=${image.width}x${image.height}`
  )

  return {
    url: image.url,
    contentType: image.content_type || 'image/jpeg',
    width: image.width || 1920,
    height: image.height || 1080,
  }
}

// ---------------------------------------------------------------------------
// Compressão e Upload para R2
// ---------------------------------------------------------------------------

/**
 * Baixa a imagem do Fal.ai, comprime para WebP e faz upload para R2.
 *
 * A compressão usa qualidade adaptativa para atingir o alvo de tamanho
 * (50-80 KB), reduzindo progressivamente se necessário.
 */
export async function uploadFluxImageToR2(
  falImage: FalGenerateResult,
  options?: {
    r2Key?: string
    /** Prefixo para a chave no R2 (default: 'images') */
    prefix?: string
  }
): Promise<FalUploadResult> {
  const prefix = options?.prefix || getR2Prefix()
  const r2Key =
    options?.r2Key || `${prefix}/flux-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
  const publicBaseUrl = R2_PUBLIC_URL.replace(/\/+$/, '')

  if (!publicBaseUrl) {
    throw new Error('R2_PUBLIC_URL não configurado.')
  }

  // 1. Download da imagem do Fal.ai
  console.log('[FAL] Baixando imagem do Fal.ai:', falImage.url.slice(0, 80))

  const downloadResponse = await fetch(falImage.url, {
    signal: AbortSignal.timeout(30000),
  })

  if (!downloadResponse.ok) {
    throw new Error(
      `Falha ao baixar imagem do Fal.ai: HTTP ${downloadResponse.status}`
    )
  }

  const imageBuffer = Buffer.from(await downloadResponse.arrayBuffer())

  console.log(
    `[FAL] Imagem baixada | originalSize=${(imageBuffer.byteLength / 1024).toFixed(1)}KB`
  )

  // 2. Compressão adaptativa para WebP (alvo 50-80 KB)
  const qualities = [getWebpQuality(), 50, 40, 32, 24]
  let finalBuffer: Buffer | null = null
  let finalQuality = qualities[0]

  for (const quality of qualities) {
    const buffer = await sharp(imageBuffer)
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer()

    const sizeKb = buffer.byteLength / 1024

    console.log(
      `[FAL] WebP quality=${quality} | size=${sizeKb.toFixed(1)}KB`
    )

    if (sizeKb <= getWebpTargetSizeBytes() / 1024 || quality === qualities[qualities.length - 1]) {
      finalBuffer = buffer
      finalQuality = quality
      break
    }
  }

  if (!finalBuffer) {
    throw new Error('Falha ao comprimir imagem para WebP.')
  }

  const finalSizeKb = (finalBuffer.byteLength / 1024).toFixed(1)

  console.log(
    `[FAL] Compressão final | quality=${finalQuality} | size=${finalSizeKb}KB`
  )

  // 3. Upload para R2
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: finalBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  const r2Url = `${publicBaseUrl}/${r2Key}`

  // 4. Extrair dimensões finais
  const metadata = await sharp(finalBuffer).metadata()

  console.log(`[FAL] Upload R2 concluído | url=${r2Url}`)

  return {
    r2Url,
    r2Key,
    sizeBytes: finalBuffer.byteLength,
    width: metadata.width || falImage.width,
    height: metadata.height || falImage.height,
    falUrl: falImage.url,
  }
}

// ---------------------------------------------------------------------------
// Função de alto nível: prompt → imagem R2
// ---------------------------------------------------------------------------

/**
 * Gera uma imagem via FLUX Schnell, comprime e faz upload para R2.
 *
 * Esta é a função principal a ser usada pelas rotas de Palavra do Dia
 * e Capa de Episódio.
 *
 * @param prompt - O prompt completo para o FLUX (full_prompt_with_text)
 * @param options - Opções de geração e upload
 * @returns URL pública da imagem no R2 + metadados
 */
export async function generateAndUploadFluxImage(
  prompt: string,
  options?: {
    imageSize?: FalGenerateParams['imageSize']
    r2Prefix?: string
    r2Key?: string
  }
): Promise<FalUploadResult> {
  if (!prompt || prompt.trim().length < 10) {
    throw new Error('Prompt muito curto para gerar imagem com FLUX.')
  }

  const falImage = await generateWithFlux({
    prompt,
    imageSize: options?.imageSize || 'landscape_16_9',
  })

  return uploadFluxImageToR2(falImage, {
    prefix: options?.r2Prefix || getR2Prefix(),
    r2Key: options?.r2Key,
  })
}