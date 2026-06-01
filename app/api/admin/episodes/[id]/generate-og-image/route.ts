import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { getPublicAppUrl } from '@/lib/appUrl'
import { R2_BUCKET_NAME, R2_PUBLIC_URL, r2Client } from '@/lib/r2/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type RouteParams = {
  id: string
}

type RouteProps = {
  params: Promise<RouteParams>
}

type GenerateOgRequest = {
  force?: unknown
}

type EpisodeRecord = {
  id: string
  title: string
  cover_image_url: string | null
  og_image_url: string | null
  series: {
    cover_image_url?: string | null
  } | null
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maxRecommendedSizeBytes = 800 * 1024

function getAdminSecret() {
  return process.env.ADMIN_API_SECRET || ''
}

async function isAdminSession() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const adminEmail = (
      process.env.ADMIN_EMAIL || 'djeonewill@gmail.com'
    ).toLowerCase()

    return Boolean(user?.email && user.email.toLowerCase() === adminEmail)
  } catch {
    return false
  }
}

async function getAdminAuthError(request: NextRequest) {
  const adminSecret = getAdminSecret()

  if (!adminSecret) {
    return NextResponse.json(
      { error: 'Configuracao administrativa ausente.' },
      { status: 500 }
    )
  }

  const headerPassword = request.headers.get('x-admin-password') || ''
  const authHeader = request.headers.get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  if (
    headerPassword === adminSecret ||
    bearerToken === adminSecret ||
    (await isAdminSession())
  ) {
    return null
  }

  return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  return String(error)
}

function getOgImageKey(episodeId: string, force: boolean) {
  if (force) {
    return `og/episodes/${episodeId}-audio-og-v7-${Date.now()}.png`
  }

  return `og/episodes/${episodeId}-audio-og-v7.png`
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const authError = await getAdminAuthError(request)
  if (authError) return authError

  const { id } = await params

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: 'ID de episodio invalido.' }, { status: 400 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as GenerateOgRequest
    const force = body.force === true
    const publicBaseUrl = R2_PUBLIC_URL.replace(/\/+$/, '')

    if (!publicBaseUrl) {
      throw new Error('R2_PUBLIC_URL nao configurado.')
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('episodes')
      .select(
        `
        id,
        title,
        cover_image_url,
        og_image_url,
        series:series_id (
          cover_image_url
        )
      `
      )
      .eq('id', id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Episodio nao encontrado.' }, { status: 404 })
    }

    const episode = data as EpisodeRecord

    if (episode.og_image_url && !force) {
      return NextResponse.json({
        ok: true,
        episode_id: episode.id,
        og_image_url: episode.og_image_url,
        reused_existing: true,
      })
    }

    const appUrl = getPublicAppUrl()
    const sourceUrl = `${appUrl}/api/og/episode/${episode.id}?v=audio-og-v7&static=1`
    const imageResponse = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'DjeoneApp/1.0 episode-og-static-generator',
      },
      cache: 'no-store',
    })

    if (!imageResponse.ok) {
      throw new Error(`Falha ao gerar OG dinamico: ${imageResponse.status}`)
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png'

    if (!contentType.startsWith('image/')) {
      throw new Error(`Content-Type invalido para OG: ${contentType}`)
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer())

    if (!buffer.byteLength) {
      throw new Error('Imagem OG gerada vazia.')
    }

    const key = getOgImageKey(episode.id, force)
    const ogImageUrl = `${publicBaseUrl}/${key}`

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        og_image_url: ogImageUrl,
      })
      .eq('id', episode.id)

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      episode_id: episode.id,
      og_image_url: ogImageUrl,
      size_bytes: buffer.byteLength,
      content_type: 'image/png',
      warning:
        buffer.byteLength > maxRecommendedSizeBytes
          ? 'Imagem acima de 800 KB; considerar otimizar em um patch futuro.'
          : null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}
