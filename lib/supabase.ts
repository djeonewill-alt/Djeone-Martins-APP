import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verificar se tem authorization header (segurança)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Buscar episódios agendados que já passaram da hora
    const { data: scheduledEpisodes, error: fetchError } = await supabase
      .from('episodes')
      .select('id, title, scheduled_publish_at')
      .eq('status', 'draft')
      .not('scheduled_publish_at', 'is', null)
      .lte('scheduled_publish_at', now)

    if (fetchError) throw fetchError

    if (!scheduledEpisodes || scheduledEpisodes.length === 0) {
      return NextResponse.json({ 
        message: 'No episodes to publish',
        count: 0 
      })
    }

    // Publicar todos os episódios
    const ids = scheduledEpisodes.map(ep => ep.id)
    
    const { error: updateError } = await supabase
      .from('episodes')
      .update({ 
        status: 'published',
        scheduled_publish_at: null 
      })
      .in('id', ids)

    if (updateError) throw updateError

    console.log(`Published ${scheduledEpisodes.length} episode(s):`, 
      scheduledEpisodes.map(ep => ep.title))

    return NextResponse.json({
      message: 'Episodes published successfully',
      count: scheduledEpisodes.length,
      episodes: scheduledEpisodes
    })

  } catch (error) {
    console.error('Error publishing scheduled episodes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}