'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { supabase } from '@/lib/supabase'

type EpisodeWithSeries = {
  id: string
  title: string
  episode_number: number | null
  series_id: string | null
  cover_image_url: string | null
  status: string | null
  editorial_status: string | null
  calendar_scheduled_at: string | null
  created_at: string | null
  series: { title: string | null }[] | null
}

type CalendarDay = {
  date: number
  dateObj: Date
  isCurrentMonth: boolean
  isToday: boolean
  episodes: EpisodeWithSeries[]
}

type MonthData = {
  year: number
  month: number
  firstDay: number // 0=Sun
  daysInMonth: number
}

const ADMIN_STORAGE_KEY = 'djeone_admin_logged'
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? ''

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getMonthData(year: number, month: number): MonthData {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { year, month, firstDay, daysInMonth }
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function AdminAgendaPage() {
  const [isLogged, setIsLogged] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Calendar state
  const today = useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  // Data
  const [repositoryEpisodes, setRepositoryEpisodes] = useState<EpisodeWithSeries[]>([])
  const [calendarEpisodes, setCalendarEpisodes] = useState<EpisodeWithSeries[]>([])

  const monthData = useMemo(
    () => getMonthData(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  // Login effect
  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY)
    setIsLogged(stored === 'true')
  }, [])

  // Load data when logged in
  useEffect(() => {
    if (isLogged) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [isLogged])

  async function loadData() {
    setLoading(true)
    setLoadError('')

    try {
      // Query 1: Repository episodes (editorial_status = 'repository')
      const { data: repoData, error: repoError } = await supabase
        .from('episodes')
        .select(
          'id, title, episode_number, series_id, cover_image_url, status, editorial_status, calendar_scheduled_at, created_at, series:series_id(title)'
        )
        .eq('editorial_status', 'repository')
        .order('created_at', { ascending: false })

      if (repoError) throw repoError

      // Query 2: Calendar-scheduled episodes
      const { data: calData, error: calError } = await supabase
        .from('episodes')
        .select(
          'id, title, episode_number, series_id, cover_image_url, status, editorial_status, calendar_scheduled_at, created_at, series:series_id(title)'
        )
        .not('calendar_scheduled_at', 'is', null)
        .order('calendar_scheduled_at', { ascending: true })

      if (calError) throw calError

      setRepositoryEpisodes((repoData as unknown as EpisodeWithSeries[]) || [])
      setCalendarEpisodes((calData as unknown as EpisodeWithSeries[]) || [])
    } catch (err) {
      console.error('Erro ao carregar agenda:', err)
      setLoadError('Não foi possível carregar os dados da agenda.')
    } finally {
      setLoading(false)
    }
  }

  // Calendar grid computation
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const days: CalendarDay[] = []
    const { year, month, firstDay, daysInMonth } = monthData

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = prevMonthDays - i
      const dateObj = new Date(year, month - 1, date)
      days.push({
        date,
        dateObj,
        isCurrentMonth: false,
        isToday: false,
        episodes: [],
      })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      const isTodayFlag = isSameDay(dateObj, today)
      const dayEpisodes = calendarEpisodes.filter((ep) => {
        if (!ep.calendar_scheduled_at) return false
        const epDate = new Date(ep.calendar_scheduled_at)
        return isSameDay(epDate, dateObj)
      })
      days.push({
        date: d,
        dateObj,
        isCurrentMonth: true,
        isToday: isTodayFlag,
        episodes: dayEpisodes,
      })
    }

    // Next month padding (to fill up to 6 rows = 42 cells)
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d)
      days.push({
        date: d,
        dateObj,
        isCurrentMonth: false,
        isToday: false,
        episodes: [],
      })
    }

    return days
  }, [monthData, calendarEpisodes, today])

  // Counters
  const scheduledThisMonth = useMemo(() => {
    return calendarEpisodes.filter((ep) => {
      if (!ep.calendar_scheduled_at) return false
      const d = new Date(ep.calendar_scheduled_at)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    }).length
  }, [calendarEpisodes, currentYear, currentMonth])

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!ADMIN_PASSWORD) {
      setLoginError('Senha administrativa não configurada no ambiente.')
      return
    }

    if (password.trim() === ADMIN_PASSWORD) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, 'true')
      setIsLogged(true)
      setPassword('')
      setLoginError('')
      return
    }

    setLoginError('Senha incorreta. Tente novamente.')
  }

  function handleLogout() {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    window.location.href = '/cadastro'
  }

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  function goToToday() {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }

  // ---- Login screen ----
  if (!isLogged) {
    return (
      <main className="admin-page">
        <section className="login-card">
          <div className="login-badge">Painel Admin</div>
          <h1>Agenda de Episódios</h1>
          <p>
            Acesse o painel para organizar os episódios prontos antes de publicar.
          </p>
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-password">Senha administrativa</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
            />
            {loginError && <span className="form-error">{loginError}</span>}
            <button type="submit">Entrar</button>
          </form>
          <Link href="/admin" className="back-link">
            Voltar ao painel
          </Link>
        </section>
        <style jsx>{styles}</style>
      </main>
    )
  }

  // ---- Loading ----
  if (loading) {
    return (
      <main className="admin-page">
        <div className="page-container">
          <div className="loading-state">Carregando agenda...</div>
        </div>
        <style jsx>{styles}</style>
      </main>
    )
  }

  // ---- Main content ----
  return (
    <main className="admin-page">
      <div className="page-container">
        {/* Header */}
        <header className="page-header">
          <div>
            <span className="eyebrow">Agenda</span>
            <h1>Agenda de Episódios</h1>
            <p>Organize os episódios prontos antes de publicar.</p>
          </div>
          <div className="header-actions">
            <button type="button" onClick={loadData} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        {loadError && <div className="alert">{loadError}</div>}

        {/* Summary cards */}
        <section className="summary-cards">
          <div className="summary-card gold">
            <div className="summary-card-icon">📦</div>
            <div>
              <strong>{repositoryEpisodes.length}</strong>
              <span>No repositório</span>
            </div>
          </div>
          <div className="summary-card blue">
            <div className="summary-card-icon">📅</div>
            <div>
              <strong>{calendarEpisodes.length}</strong>
              <span>Agendados no calendário</span>
            </div>
          </div>
          <div className="summary-card purple">
            <div className="summary-card-icon">🗓️</div>
            <div>
              <strong>{scheduledThisMonth}</strong>
              <span>Este mês</span>
            </div>
          </div>
        </section>

        {/* Two-column layout */}
        <div className="agenda-layout">
          {/* Left: Calendar */}
          <section className="calendar-section">
            {/* Month navigation */}
            <div className="calendar-nav">
              <button type="button" onClick={goToPreviousMonth} className="nav-button">
                ←
              </button>
              <div className="month-title">
                <h2>{MONTHS_PT[currentMonth]} {currentYear}</h2>
              </div>
              <button type="button" onClick={goToNextMonth} className="nav-button">
                →
              </button>
              <button type="button" onClick={goToToday} className="today-button">
                Hoje
              </button>
            </div>

            {/* Day-of-week header */}
            <div className="calendar-weekdays">
              {DAYS_PT.map((day) => (
                <div key={day} className="weekday-label">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="calendar-grid">
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`calendar-cell ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''}`}
                >
                  <span className="day-number">{day.date}</span>
                  <div className="day-episodes">
                    {day.episodes.slice(0, 2).map((ep) => (
                      <div key={ep.id} className="day-episode-chip" title={ep.title}>
                        <span className="chip-series">
                          {ep.series?.[0]?.title || 'Sem série'} — Ep. {ep.episode_number ?? '?'}
                        </span>
                        <span className="chip-title">{ep.title}</span>
                      </div>
                    ))}
                    {day.episodes.length > 2 && (
                      <div className="day-episode-more">
                        +{day.episodes.length - 2} episódios
                      </div>
                    )}
                  </div>
                  <div className="day-hint">Agendamento será liberado no próximo patch.</div>
                </div>
              ))}
            </div>

            {/* Empty calendar message */}
            {calendarEpisodes.length === 0 && (
              <div className="calendar-empty-msg">
                Nenhum episódio agendado neste mês.
              </div>
            )}
          </section>

          {/* Right: Repository sidebar */}
          <aside className="repository-sidebar">
            <div className="sidebar-header">
              <span className="eyebrow">Repositório</span>
              <h2>Aguardando agendamento</h2>
            </div>

            {repositoryEpisodes.length === 0 ? (
              <div className="empty-repository">
                Não há episódios aguardando agendamento.
              </div>
            ) : (
              <div className="repository-list">
                {repositoryEpisodes.map((ep) => (
                  <div key={ep.id} className="repo-card">
                    <div className="repo-card-header">
                      <span className="repo-series">
                        {ep.series?.[0]?.title || 'Sem série'} — Ep. {ep.episode_number ?? '?'}
                      </span>
                      <span className="repo-status-badge">No repositório</span>
                    </div>
                    <h3 className="repo-title">{ep.title}</h3>
                    <p className="repo-date">Criado em {formatDate(ep.created_at)}</p>
                    <Link
                      href={`/admin/episodios/${ep.id}`}
                      className="repo-edit-link"
                    >
                      Abrir edição
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

      <style jsx>{styles}</style>
    </main>
  )
}

const styles = `
  .admin-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34rem),
      radial-gradient(circle at top right, rgba(147, 51, 234, 0.14), transparent 30rem),
      #030712;
    color: #f8fafc;
    padding: 32px 24px 56px;
  }

  .page-container {
    max-width: 1280px;
    margin: 0 auto;
  }

  .eyebrow {
    display: inline-block;
    color: #93c5fd;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    margin-bottom: 7px;
  }

  h1, h2, h3, p { margin: 0; }

  .page-header {
    padding-bottom: 28px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }

  .page-header h1 {
    font-size: clamp(2rem, 4vw, 3.2rem);
    line-height: 0.98;
    letter-spacing: -0.07em;
  }

  .page-header p {
    color: #bfdbfe;
    margin-top: 12px;
    max-width: 680px;
    line-height: 1.6;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  button, .nav-button, .today-button {
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(15, 23, 42, 0.74);
    color: #f8fafc;
    border-radius: 16px;
    padding: 12px 18px;
    font-weight: 900;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }

  button:hover {
    transform: translateY(-1px);
    border-color: rgba(147, 197, 253, 0.5);
    background: rgba(30, 41, 59, 0.9);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }

  .logout-button {
    background: rgba(136, 19, 55, 0.3);
    border-color: rgba(244, 63, 94, 0.28);
  }

  .alert {
    margin-top: 22px;
    padding: 14px 18px;
    border-radius: 18px;
    background: rgba(127, 29, 29, 0.32);
    border: 1px solid rgba(248, 113, 113, 0.24);
    color: #fecaca;
    font-weight: 800;
  }

  .loading-state {
    margin-top: 48px;
    text-align: center;
    color: #94a3b8;
    font-weight: 800;
    font-size: 1.1rem;
  }

  /* ---------- Summary cards ---------- */
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 24px;
  }

  .summary-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    border-radius: 24px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(15, 23, 42, 0.78);
  }

  .summary-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    font-size: 1.4rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .summary-card strong {
    display: block;
    font-size: 1.8rem;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .summary-card span {
    color: #bfdbfe;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: lowercase;
    margin-top: 4px;
    display: block;
  }

  .gold { border-color: rgba(245, 158, 11, 0.28); }
  .blue { border-color: rgba(96, 165, 250, 0.24); }
  .purple { border-color: rgba(168, 85, 247, 0.24); }

  /* ---------- Two-column layout ---------- */
  .agenda-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    margin-top: 28px;
    align-items: start;
  }

  /* ---------- Calendar ---------- */
  .calendar-section {
    border-radius: 28px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(15, 23, 42, 0.78);
    padding: 24px;
    position: relative;
  }

  .calendar-nav {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .nav-button {
    width: 44px;
    height: 44px;
    padding: 0;
    display: grid;
    place-items: center;
    font-size: 1.2rem;
    border-radius: 14px;
  }

  .month-title {
    flex: 1;
  }

  .month-title h2 {
    font-size: 1.4rem;
    letter-spacing: -0.04em;
    font-weight: 900;
  }

  .today-button {
    padding: 8px 16px;
    font-size: 0.8rem;
    border-radius: 12px;
    background: rgba(59, 130, 246, 0.18);
    border-color: rgba(96, 165, 250, 0.3);
  }

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 8px;
  }

  .weekday-label {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #94a3b8;
    letter-spacing: 0.06em;
    padding: 8px 0;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .calendar-cell {
    min-height: 100px;
    padding: 6px;
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.4);
    border: 1px solid rgba(148, 163, 184, 0.06);
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .calendar-cell.other-month {
    opacity: 0.3;
  }

  .calendar-cell.today {
    border-color: rgba(96, 165, 250, 0.5);
    background: rgba(30, 64, 175, 0.15);
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.2);
  }

  .day-number {
    font-size: 0.85rem;
    font-weight: 800;
    color: #cbd5e1;
    margin-bottom: 4px;
    display: block;
  }

  .calendar-cell.today .day-number {
    color: #93c5fd;
  }

  .day-episodes {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }

  .day-episode-chip {
    padding: 3px 6px;
    border-radius: 6px;
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(96, 165, 250, 0.15);
    cursor: default;
    overflow: hidden;
    min-height: 0;
  }

  .chip-series {
    display: block;
    font-size: 0.6rem;
    font-weight: 900;
    color: #93c5fd;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .chip-title {
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .day-episode-more {
    font-size: 0.6rem;
    font-weight: 800;
    color: #a78bfa;
    padding: 2px 6px;
  }

  .day-hint {
    display: none;
    position: absolute;
    bottom: 4px;
    left: 6px;
    right: 6px;
    font-size: 0.55rem;
    color: #64748b;
    text-align: center;
  }

  .calendar-cell:hover .day-hint {
    display: block;
  }

  .calendar-empty-msg {
    text-align: center;
    padding: 32px 16px;
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 700;
  }

  /* ---------- Repository sidebar ---------- */
  .repository-sidebar {
    border-radius: 28px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(15, 23, 42, 0.78);
    padding: 24px;
  }

  .sidebar-header {
    margin-bottom: 20px;
  }

  .sidebar-header h2 {
    font-size: 1.1rem;
    letter-spacing: -0.04em;
    font-weight: 900;
  }

  .empty-repository {
    text-align: center;
    padding: 40px 16px;
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.6;
    border-radius: 18px;
    border: 1px dashed rgba(148, 163, 184, 0.1);
  }

  .repository-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 70vh;
    overflow-y: auto;
    padding-right: 4px;
  }

  .repository-list::-webkit-scrollbar {
    width: 4px;
  }

  .repository-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .repository-list::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.2);
    border-radius: 4px;
  }

  .repo-card {
    padding: 16px;
    border-radius: 18px;
    background: rgba(2, 6, 23, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.1);
  }

  .repo-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .repo-series {
    font-size: 0.7rem;
    font-weight: 800;
    color: #93c5fd;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .repo-status-badge {
    font-size: 0.6rem;
    font-weight: 900;
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.18);
    border-radius: 20px;
    padding: 2px 8px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .repo-title {
    font-size: 0.95rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.3;
    margin-bottom: 6px;
  }

  .repo-date {
    font-size: 0.7rem;
    color: #94a3b8;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .repo-edit-link {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 12px;
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(96, 165, 250, 0.2);
    color: #93c5fd;
    font-size: 0.75rem;
    font-weight: 900;
    text-decoration: none;
    transition: background 0.2s ease;
  }

  .repo-edit-link:hover {
    background: rgba(59, 130, 246, 0.25);
  }

  /* ---------- Login ---------- */
  .login-card {
    width: min(100%, 460px);
    margin: 9vh auto 0;
    padding: 34px;
    border-radius: 32px;
    background: rgba(15, 23, 42, 0.84);
    border: 1px solid rgba(148, 163, 184, 0.18);
    box-shadow: 0 24px 90px rgba(0, 0, 0, 0.35);
  }

  .login-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 7px 12px;
    background: rgba(59, 130, 246, 0.14);
    color: #93c5fd;
    font-size: 0.76rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    margin-bottom: 18px;
  }

  .login-card h1 {
    font-size: 2.4rem;
    letter-spacing: -0.07em;
    line-height: 1;
  }

  .login-card p {
    color: #bfdbfe;
    line-height: 1.65;
    margin: 14px 0 24px;
  }

  form {
    display: grid;
    gap: 12px;
  }

  label {
    color: #dbeafe;
    font-weight: 900;
    font-size: 0.86rem;
  }

  input {
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: rgba(2, 6, 23, 0.58);
    color: #f8fafc;
    border-radius: 16px;
    padding: 14px 16px;
    outline: none;
  }

  input:focus {
    border-color: rgba(96, 165, 250, 0.6);
    background: rgba(2, 6, 23, 0.8);
  }

  button[type="submit"] {
    margin-top: 4px;
    background: rgba(37, 99, 235, 0.5);
    border-color: rgba(96, 165, 250, 0.36);
    font-size: 1rem;
    padding: 16px;
  }

  .form-error {
    color: #fca5a5;
    font-size: 0.82rem;
    font-weight: 800;
  }

  .back-link {
    display: block;
    margin-top: 20px;
    color: #94a3b8;
    font-weight: 800;
    font-size: 0.85rem;
    text-align: center;
    text-decoration: none;
  }

  .back-link:hover {
    color: #cbd5e1;
  }

  /* ---------- Responsive ---------- */
  @media (max-width: 900px) {
    .agenda-layout {
      grid-template-columns: 1fr;
    }
    .summary-cards {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 600px) {
    .summary-cards {
      grid-template-columns: 1fr;
    }
    .calendar-cell {
      min-height: 70px;
      padding: 4px;
    }
    .day-episode-chip {
      display: none;
    }
    .calendar-cell.today .day-episode-chip {
      display: block;
    }
  }
`