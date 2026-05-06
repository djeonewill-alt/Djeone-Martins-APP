'use client'

import { FormEvent, ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = 'djeone2025'

type AdminStats = {
  totalSeries: number
  totalEpisodes: number
  publishedEpisodes: number
  scheduledEpisodes: number
  totalDailyQuotes: number
  publishedDailyQuotes: number
  prayerRequests: number
  publicPrayerRequests: number
  privatePrayerRequests: number
  answeredPrayerRequests: number
  prayerInteractions: number
  prayerEncouragements: number
  favorites: number
}

const initialStats: AdminStats = {
  totalSeries: 0,
  totalEpisodes: 0,
  publishedEpisodes: 0,
  scheduledEpisodes: 0,
  totalDailyQuotes: 0,
  publishedDailyQuotes: 0,
  prayerRequests: 0,
  publicPrayerRequests: 0,
  privatePrayerRequests: 0,
  answeredPrayerRequests: 0,
  prayerInteractions: 0,
  prayerEncouragements: 0,
  favorites: 0,
}

function StatCard({
  label,
  value,
  helper,
  icon,
  href,
  accent = 'blue',
}: {
  label: string
  value: number
  helper: string
  icon: string
  href?: string
  accent?: 'blue' | 'gold' | 'green' | 'purple' | 'cyan'
}) {
  const accentClass =
    accent === 'gold'
      ? 'border-yellow-300/15 bg-yellow-500/10 text-yellow-100'
      : accent === 'green'
        ? 'border-emerald-300/15 bg-emerald-500/10 text-emerald-100'
        : accent === 'purple'
          ? 'border-purple-300/15 bg-purple-500/10 text-purple-100'
          : accent === 'cyan'
            ? 'border-cyan-300/15 bg-cyan-500/10 text-cyan-100'
            : 'border-blue-300/15 bg-blue-500/10 text-blue-100'

  const content = (
    <div className={`relative overflow-hidden rounded-[28px] border p-5 ${accentClass}`}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="text-3xl">{icon}</div>

          {href && (
            <span className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/70">
              Abrir
            </span>
          )}
        </div>

        <p className="text-4xl font-black tracking-[-0.075em] text-white">
          {value}
        </p>

        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] opacity-80">
          {label}
        </p>

        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {helper}
        </p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block active:scale-[0.99]">
        {content}
      </Link>
    )
  }

  return content
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  accent = 'blue',
}: {
  href: string
  icon: string
  title: string
  subtitle: string
  accent?: 'blue' | 'gold' | 'green' | 'purple'
}) {
  const accentClass =
    accent === 'gold'
      ? 'from-yellow-500/14 via-slate-900/80 to-slate-950 border-yellow-300/15'
      : accent === 'green'
        ? 'from-emerald-500/14 via-slate-900/80 to-slate-950 border-emerald-300/15'
        : accent === 'purple'
          ? 'from-purple-500/14 via-slate-900/80 to-slate-950 border-purple-300/15'
          : 'from-blue-500/14 via-slate-900/80 to-slate-950 border-blue-300/15'

  return (
    <Link
      href={href}
      className={`relative block overflow-hidden rounded-[30px] border bg-gradient-to-br p-5 shadow-[0_18px_55px_rgba(0,0,0,0.26)] active:scale-[0.99] ${accentClass}`}
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.055] text-2xl">
          {icon}
        </div>

        <div>
          <h3 className="text-lg font-black tracking-[-0.04em] text-white">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>
    </Link>
  )
}

function AdminSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-8">
      <div className="mb-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] text-white">
          {title}
        </h2>
      </div>

      {children}
    </section>
  )
}

export default function Admin() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [stats, setStats] = useState<AdminStats>(initialStats)
  const [loadingStats, setLoadingStats] = useState(false)

  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('admin_logged_in')

    if (adminLoggedIn === 'true') {
      setIsAuthenticated(true)
      loadStats()
    }
  }, [])

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_logged_in', 'true')
      setIsAuthenticated(true)
      loadStats()
    } else {
      alert('Senha incorreta.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    setIsAuthenticated(false)
    router.push('/')
  }

  const getCount = async (
    table: string,
    filters?: (query: any) => any
  ): Promise<number> => {
    try {
      let query = supabase
        .from(table)
        .select('id', {
          count: 'exact',
          head: true,
        })

      if (filters) {
        query = filters(query)
      }

      const { count, error } = await query

      if (error) {
        console.warn(`Não foi possível contar ${table}:`, error.message)
        return 0
      }

      return count || 0
    } catch (error) {
      console.warn(`Erro ao contar ${table}:`, error)
      return 0
    }
  }

  const loadStats = async () => {
    setLoadingStats(true)

    try {
      const [
        totalSeries,
        totalEpisodes,
        publishedEpisodes,
        scheduledEpisodes,
        totalDailyQuotes,
        publishedDailyQuotes,
        prayerRequests,
        publicPrayerRequests,
        privatePrayerRequests,
        answeredPrayerRequests,
        prayerInteractions,
        prayerEncouragements,
        favorites,
      ] = await Promise.all([
        getCount('series'),
        getCount('episodes'),
        getCount('episodes', (query) =>
          query.or('status.eq.published,status.is.null')
        ),
        getCount('episodes', (query) => query.eq('status', 'scheduled')),
        getCount('daily_quotes'),
        getCount('daily_quotes', (query) => query.eq('status', 'published')),
        getCount('prayer_requests'),
        getCount('prayer_requests', (query) => query.eq('is_private', false)),
        getCount('prayer_requests', (query) => query.eq('is_private', true)),
        getCount('prayer_requests', (query) => query.eq('is_answered', true)),
        getCount('prayer_interactions'),
        getCount('prayer_encouragements'),
        getCount('user_favorites'),
      ])

      setStats({
        totalSeries,
        totalEpisodes,
        publishedEpisodes,
        scheduledEpisodes,
        totalDailyQuotes,
        publishedDailyQuotes,
        prayerRequests,
        publicPrayerRequests,
        privatePrayerRequests,
        answeredPrayerRequests,
        prayerInteractions,
        prayerEncouragements,
        favorites,
      })
    } finally {
      setLoadingStats(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/85 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
        >
          <div className="mb-6">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Admin
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.065em]">
              Painel ministerial
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Acesse o painel para gerenciar conteúdos, séries, orações e indicadores do aplicativo.
            </p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite a senha"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"
          />

          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-[0_14px_38px_rgba(37,99,235,0.22)]"
          >
            Entrar no painel
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-20 pt-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
              Painel Admin
            </p>

            <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.075em]">
              Dashboard ministerial
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Acompanhe conteúdos, oração, engajamento e ações principais do aplicativo.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadStats}
              disabled={loadingStats}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {loadingStats ? 'Atualizando...' : 'Atualizar'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl border border-red-300/15 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="relative mb-8 overflow-hidden rounded-[36px] border border-white/10 bg-slate-900/80 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl" />

          <div className="relative grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
                Visão geral
              </p>

              <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.08em]">
                Seu app em números
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
                Use estes indicadores para entender se o app está gerando conteúdo, oração, compartilhamento e relacionamento espiritual.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-blue-300/15 bg-blue-500/10 p-4">
                <p className="text-3xl font-black text-blue-100">
                  {stats.totalEpisodes}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  episódios totais
                </p>
              </div>

              <div className="rounded-[24px] border border-yellow-300/15 bg-yellow-500/10 p-4">
                <p className="text-3xl font-black text-yellow-100">
                  {stats.prayerInteractions}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  orações registradas
                </p>
              </div>
            </div>
          </div>
        </section>

        <AdminSection eyebrow="Conteúdo" title="Produção e publicação">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              icon="🎧"
              label="Episódios"
              value={stats.totalEpisodes}
              helper={`${stats.publishedEpisodes} publicados`}
              href="/admin/episodios"
              accent="blue"
            />

            <StatCard
              icon="⏰"
              label="Agendados"
              value={stats.scheduledEpisodes}
              helper="episódios aguardando publicação"
              href="/admin/episodios"
              accent="purple"
            />

            <StatCard
              icon="📚"
              label="Séries"
              value={stats.totalSeries}
              helper="séries cadastradas"
              href="/admin/series"
              accent="green"
            />

            <StatCard
              icon="📖"
              label="Palavras"
              value={stats.totalDailyQuotes}
              helper={`${stats.publishedDailyQuotes} publicadas`}
              accent="gold"
            />
          </div>
        </AdminSection>

        <AdminSection eyebrow="Oração" title="Comunidade e intercessão">
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              icon="🙏"
              label="Pedidos"
              value={stats.prayerRequests}
              helper="pedidos totais"
              href="/admin/oracoes"
              accent="blue"
            />

            <StatCard
              icon="🌍"
              label="Públicos"
              value={stats.publicPrayerRequests}
              helper="visíveis no mural"
              href="/admin/oracoes"
              accent="green"
            />

            <StatCard
              icon="🔒"
              label="Privados"
              value={stats.privatePrayerRequests}
              helper="pedidos pastorais"
              href="/admin/oracoes"
              accent="gold"
            />

            <StatCard
              icon="✅"
              label="Respondidos"
              value={stats.answeredPrayerRequests}
              helper="testemunhos marcados"
              href="/admin/oracoes"
              accent="cyan"
            />

            <StatCard
              icon="💙"
              label="Encorajar"
              value={stats.prayerEncouragements}
              helper="mensagens enviadas"
              accent="purple"
            />
          </div>
        </AdminSection>

        <AdminSection eyebrow="Engajamento" title="Sinais de vida no app">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              icon="🤲"
              label="Eu orei"
              value={stats.prayerInteractions}
              helper="cliques de intercessão"
              accent="gold"
            />

            <StatCard
              icon="♡"
              label="Favoritos"
              value={stats.favorites}
              helper="conteúdos salvos"
              accent="blue"
            />

            <StatCard
              icon="🔔"
              label="Notificações"
              value={0}
              helper="em breve: inscritos em push"
              accent="green"
            />
          </div>
        </AdminSection>

        <AdminSection eyebrow="Ações rápidas" title="Gerenciar aplicativo">
          <div className="grid gap-4 md:grid-cols-3">
            <QuickAction
              href="/admin/novo-episodio"
              icon="🎙️"
              title="Novo episódio"
              subtitle="Gravar, transcrever, gerar Palavra do Dia e publicar."
              accent="blue"
            />

            <QuickAction
              href="/admin/nova-serie"
              icon="📚"
              title="Nova série"
              subtitle="Criar uma nova jornada devocional."
              accent="green"
            />

            <QuickAction
              href="/admin/episodios"
              icon="🎧"
              title="Episódios"
              subtitle="Editar, revisar e gerenciar episódios publicados."
              accent="purple"
            />

            <QuickAction
              href="/admin/series"
              icon="🗂️"
              title="Séries"
              subtitle="Organizar séries, capas, títulos e ordem."
              accent="gold"
            />

            <QuickAction
              href="/admin/oracoes"
              icon="🙏"
              title="Orações"
              subtitle="Acompanhar pedidos públicos, privados e respondidos."
              accent="blue"
            />

            <QuickAction
              href="/"
              icon="📱"
              title="Ver app"
              subtitle="Abrir a experiência pública do aplicativo."
              accent="green"
            />
          </div>
        </AdminSection>
      </div>
    </div>
  )
}
