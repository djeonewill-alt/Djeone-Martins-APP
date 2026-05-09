'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type PremiumInterestRow = {
  id: string
  auth_user_id: string
  area: string
  note: string | null
  source: string
  created_at: string
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return 'Data inválida'
  }
}

export default function AdminPremiumInteressesPage() {
  const [items, setItems] = useState<PremiumInterestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInterests()
  }, [])

  async function loadInterests() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('premium_interest')
        .select('id, auth_user_id, area, note, source, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      setItems((data || []) as PremiumInterestRow[])
    } catch (error) {
      console.error('Erro ao carregar interesses premium:', error)
      alert('Não foi possível carregar os interesses premium agora.')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    if (!term) return items

    return items.filter((item) => {
      return (
        item.area.toLowerCase().includes(term) ||
        (item.note || '').toLowerCase().includes(term) ||
        item.auth_user_id.toLowerCase().includes(term)
      )
    })
  }, [items, searchTerm])

  const areaStats = useMemo(() => {
    const map = new Map<string, number>()

    for (const item of items) {
      map.set(item.area, (map.get(item.area) || 0) + 1)
    }

    return Array.from(map.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
  }, [items])

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-sm font-black text-blue-200 shadow-lg shadow-black/10 active:scale-[0.98]"
            >
              ← Voltar ao Admin
            </Link>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-purple-300">
              Admin / Premium
            </p>

            <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] sm:text-5xl">
              Interesses nas Jornadas Premium
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              Veja quais áreas os usuários desejam fortalecer para decidir quais
              jornadas premium criar primeiro.
            </p>
          </div>

          <button
            type="button"
            onClick={loadInterests}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-black text-slate-100 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200">
              Total de registros
            </p>

            <p className="mt-3 text-5xl font-black tracking-[-0.08em]">
              {items.length}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Cada registro representa uma área de interesse enviada por um
              usuário dentro da aba Mais.
            </p>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por área, texto ou usuário..."
              className="mt-5 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-purple-300/60"
            />
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/20">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-200">
              Áreas mais pedidas
            </p>

            {areaStats.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Ainda não há dados suficientes.
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {areaStats.map((item) => (
                  <div
                    key={item.area}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                  >
                    <span className="text-sm font-black text-slate-100">
                      {item.area}
                    </span>

                    <span className="rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-8 text-sm font-bold text-slate-400">
            Carregando interesses...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[30px] border border-white/10 bg-slate-900/70 p-10 text-center">
            <p className="text-5xl">⭐</p>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.05em]">
              Nenhum interesse encontrado
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Quando usuários preencherem o formulário, os registros aparecerão
              aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-[28px] border border-slate-700 bg-slate-900 p-5 shadow-xl shadow-black/20 ring-1 ring-white/10"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
                        {item.area}
                      </span>

                      <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-black text-slate-400">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-300">
                      {item.note || 'Sem observação adicional.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs font-bold text-slate-500 lg:min-w-[310px]">
                    <p>
                      <span className="text-slate-300">Usuário:</span>{' '}
                      {item.auth_user_id}
                    </p>

                    <p className="mt-2">
                      <span className="text-slate-300">Origem:</span>{' '}
                      {item.source}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}