import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    // 1. Buscar o episódio para verificar se existe
    const { data: episode, error: fetchError } = await supabase
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

    // 2. Deletar daily_quotes vinculadas
    const { error: quotesError } = await supabase
      .from('daily_quotes')
      .delete()
      .eq('episode_id', id)

    if (quotesError) {
      console.error('[delete-episode] Erro ao deletar daily_quotes:', quotesError)
      // Não quebra — o importante é deletar o episódio
    }

    // 3. Deletar o episódio
    const { error: deleteError } = await supabase
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