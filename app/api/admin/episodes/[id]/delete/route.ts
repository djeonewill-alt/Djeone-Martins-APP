import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'djeonewill@gmail.com'
  return raw
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    // ─── 1. Verificação de autenticação ───────────────────────────
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json(
        { success: false, error: 'Autenticação necessária.' },
        { status: 401 },
      )
    }

    const isAdmin = getAdminEmails().includes(user.email.toLowerCase())

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado.' },
        { status: 403 },
      )
    }

    // ─── 2. Operações de banco com service_role (bypass RLS) ──────
    const adminClient = createSupabaseAdminClient()

    // Buscar o episódio para verificar se existe
    const { data: episode, error: fetchError } = await adminClient
      .from('episodes')
      .select('id, title, audio_url, cover_image_url')
      .eq('id', id)
      .single()

    if (fetchError || !episode) {
      return NextResponse.json(
        { success: false, error: 'Episódio não encontrado.' },
        { status: 404 },
      )
    }

    // Deletar daily_quotes vinculadas
    const { error: quotesError } = await adminClient
      .from('daily_quotes')
      .delete()
      .eq('episode_id', id)

    if (quotesError) {
      console.error('[delete-episode] Erro ao deletar daily_quotes:', quotesError)
      // Não quebra — o importante é deletar o episódio
    }

    // Deletar o episódio
    const { error: deleteError } = await adminClient
      .from('episodes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[delete-episode] Erro ao deletar episódio:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Erro ao deletar o episódio.' },
        { status: 500 },
      )
    }

    // Nota: Arquivos R2 (audio_url, cover_image_url) não são deletados automaticamente.
    // O R2 tem política de ciclo de vida para objetos órfãos.

    return NextResponse.json({
      success: true,
      message: `Episódio "${episode.title}" e daily_quotes vinculadas foram removidos.`,
    })
  } catch (error) {
    console.error('[delete-episode] Erro:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno ao deletar episódio.',
      },
      { status: 500 },
    )
  }
}