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
  audio_url: string | null
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

type ModalState = {
  open: boolean
  selectedDate: Date | null
  selectedEpisodeId: string | null
  selectedTime: string
}

type EditModalState = {
  open: boolean
  episode: EpisodeWithSeries | null
  editDate: string // YYYY-MM-DD
  editTime: string // HH:MM
  showReturnConfirm: boolean
  showPublishConfirm: boolean
}

const ADMIN_STORAGE_KEY = 'djeone_admin_logged'
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? ''

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const pad2 = (n: number) => String(n).padStart(2, '0')

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

function formatDateBr(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTimeForDisplay(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function makeIsoOffset(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const dt = new Date(date)
  dt.setHours(hours, minutes, 0, 0)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:00-03:00`
}

function dateToInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseCalendarScheduledAt(iso: string | null | undefined): { date: Date; dateStr: string; timeStr: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return {
    date: d,
    dateStr: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    timeStr: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  }
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

  // Schedule modal state
  const [modal, setModal] = useState<ModalState>({
    open: false,
    selectedDate: null,
    selectedEpisodeId: null,
    selectedTime: '07:00',
  })
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState('')
  const [showScheduleConflictWarning, setShowScheduleConflictWarning] = useState(false)

  // Edit modal state
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    episode: null,
    editDate: '',
    editTime: '',
    showReturnConfirm: false,
    showPublishConfirm: false,
  })
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [returning, setReturning] = useState(false)
  const [showEditConflictWarning, setShowEditConflictWarning] = useState(false)

  // Publishing state
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [publishSuccess, setPublishSuccess] = useState('')

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
      const { data: repoData, error: repoError } = await supabase
        .from('episodes')
        .select(
          'id, title, episode_number, series_id, cover_image_url, audio_url, status, editorial_status, calendar_scheduled_at, created_at, series:series_id(title)'
        )
        .eq('editorial_status', 'repository')
        .order('created_at', { ascending: false })

      if (repoError) throw repoError

      const { data: calData, error: calError } = await supabase
        .from('episodes')
        .select(
          'id, title, episode_number, series_id, cover_image_url, audio_url, status, editorial_status, calendar_scheduled_at, created_at, series:series_id(title)'
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

    const prevMonthDays = new Date(year, month, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = prevMonthDays - i
      const dateObj = new Date(year, month - 1, date)
      days.push({ date, dateObj, isCurrentMonth: false, isToday: false, episodes: [] })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      const isTodayFlag = isSameDay(dateObj, today)
      const dayEpisodes = calendarEpisodes.filter((ep) => {
        if (!ep.calendar_scheduled_at) return false
        const epDate = new Date(ep.calendar_scheduled_at)
        return isSameDay(epDate, dateObj)
      })
      days.push({ date: d, dateObj, isCurrentMonth: true, isToday: isTodayFlag, episodes: dayEpisodes })
    }

    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d)
      days.push({ date: d, dateObj, isCurrentMonth: false, isToday: false, episodes: [] })
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

  // ---- Check time conflict ----
  function checkTimeConflict(date: Date, time: string, excludeEpisodeId?: string): boolean {
    const [hours, minutes] = time.split(':').map(Number)
    const candidate = new Date(date)
    candidate.setHours(hours, minutes, 0, 0)

    return calendarEpisodes.some((ep) => {
      if (!ep.calendar_scheduled_at) return false
      if (excludeEpisodeId && ep.id === excludeEpisodeId) return false
      const epDate = new Date(ep.calendar_scheduled_at)
      return isSameDay(epDate, candidate) && epDate.getHours() === hours && epDate.getMinutes() === minutes
    })
  }

  // ---- Schedule modal handlers ----
  function openScheduleModal(dateObj: Date) {
    const hasConflict = checkTimeConflict(dateObj, '07:00')
    setShowScheduleConflictWarning(hasConflict)
    setModal({
      open: true,
      selectedDate: dateObj,
      selectedEpisodeId: repositoryEpisodes.length > 0 ? repositoryEpisodes[0].id : null,
      selectedTime: '07:00',
    })
    setScheduleError('')
    setScheduleSuccess('')
  }

  function closeScheduleModal() {
    setModal({ ...modal, open: false })
    setScheduleError('')
    setScheduleSuccess('')
  }

  function handleEpisodeChange(episodeId: string) {
    setModal((prev) => ({ ...prev, selectedEpisodeId: episodeId }))
  }

  function handleScheduleTimeChange(time: string) {
    setModal((prev) => ({ ...prev, selectedTime: time }))
    if (modal.selectedDate) {
      setShowScheduleConflictWarning(checkTimeConflict(modal.selectedDate, time))
    }
  }

  function handleDayClick(dateObj: Date) {
    openScheduleModal(dateObj)
  }

  // ---- Schedule mutation ----
  async function handleSchedule() {
    if (!modal.selectedEpisodeId || !modal.selectedDate) return

    setScheduling(true)
    setScheduleError('')
    setScheduleSuccess('')

    const isoOffset = makeIsoOffset(modal.selectedDate, modal.selectedTime)

    try {
      const { error } = await supabase
        .from('episodes')
        .update({
          editorial_status: 'calendar_scheduled',
          calendar_scheduled_at: isoOffset,
        })
        .eq('id', modal.selectedEpisodeId)
        .eq('editorial_status', 'repository')

      if (error) throw error

      const scheduledEp = repositoryEpisodes.find((ep) => ep.id === modal.selectedEpisodeId)
      if (scheduledEp) {
        setRepositoryEpisodes((prev) => prev.filter((ep) => ep.id !== modal.selectedEpisodeId))
        const updatedEp: EpisodeWithSeries = {
          ...scheduledEp,
          editorial_status: 'calendar_scheduled',
          calendar_scheduled_at: isoOffset,
        }
        setCalendarEpisodes((prev) =>
          [...prev, updatedEp].sort((a, b) => {
            if (!a.calendar_scheduled_at) return 1
            if (!b.calendar_scheduled_at) return -1
            return new Date(a.calendar_scheduled_at).getTime() - new Date(b.calendar_scheduled_at).getTime()
          })
        )
      }

      setScheduleSuccess('Episódio agendado no calendário. Ele ainda não está público.')
      setTimeout(() => closeScheduleModal(), 2000)
    } catch (err) {
      console.error('Erro ao agendar episódio:', err)
      setScheduleError('Não foi possível agendar o episódio.')
    } finally {
      setScheduling(false)
    }
  }

  // ---- Edit modal handlers ----
  function openEditModal(ep: EpisodeWithSeries) {
    const parsed = parseCalendarScheduledAt(ep.calendar_scheduled_at)
    const dateStr = parsed ? parsed.dateStr : dateToInputValue(today)
    const timeStr = parsed ? parsed.timeStr : '07:00'

    setEditModal({
      open: true,
      episode: ep,
      editDate: dateStr,
      editTime: timeStr,
      showReturnConfirm: false,
      showPublishConfirm: false,
    })
    setEditError('')
    setEditSuccess('')
    setPublishError('')
    setPublishSuccess('')
    setShowEditConflictWarning(false)
  }

  function closeEditModal() {
    setEditModal({ ...editModal, open: false, showReturnConfirm: false, showPublishConfirm: false })
    setEditError('')
    setEditSuccess('')
    setPublishError('')
    setPublishSuccess('')
  }

  function handleEditDateChange(dateVal: string) {
    setEditModal((prev) => ({ ...prev, editDate: dateVal }))
  }

  function handleEditTimeChange(timeVal: string) {
    setEditModal((prev) => ({ ...prev, editTime: timeVal }))
    if (editModal.episode) {
      const [y, m, d] = editModal.editDate.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      setShowEditConflictWarning(checkTimeConflict(dateObj, timeVal, editModal.episode.id))
    }
  }

  function handleChipClick(ep: EpisodeWithSeries, event: React.MouseEvent) {
    event.stopPropagation()
    openEditModal(ep)
  }

  function showReturnConfirmation() {
    setEditModal((prev) => ({ ...prev, showReturnConfirm: true }))
  }

  function cancelReturn() {
    setEditModal((prev) => ({ ...prev, showReturnConfirm: false }))
  }

  function showPublishConfirmation() {
    setEditModal((prev) => ({ ...prev, showPublishConfirm: true }))
  }

  function cancelPublish() {
    setEditModal((prev) => ({ ...prev, showPublishConfirm: false }))
  }

  // ---- Edit save mutation ----
  async function handleEditSave() {
    const ep = editModal.episode
    if (!ep) return

    setEditing(true)
    setEditError('')
    setEditSuccess('')

    const [y, m, d] = editModal.editDate.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    const isoOffset = makeIsoOffset(dateObj, editModal.editTime)

    try {
      const { error } = await supabase
        .from('episodes')
        .update({ calendar_scheduled_at: isoOffset })
        .eq('id', ep.id)
        .eq('editorial_status', 'calendar_scheduled')

      if (error) throw error

      const updatedEp: EpisodeWithSeries = { ...ep, calendar_scheduled_at: isoOffset }
      setCalendarEpisodes((prev) =>
        prev.map((e) => (e.id === ep.id ? updatedEp : e)).sort((a, b) => {
          if (!a.calendar_scheduled_at) return 1
          if (!b.calendar_scheduled_at) return -1
          return new Date(a.calendar_scheduled_at).getTime() - new Date(b.calendar_scheduled_at).getTime()
        })
      )
      setEditModal((prev) => ({ ...prev, episode: updatedEp }))
      setEditSuccess('Agendamento atualizado. O episódio ainda não está público.')
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err)
      setEditError('Não foi possível atualizar o agendamento.')
    } finally {
      setEditing(false)
    }
  }

  // ---- Return to repository mutation ----
  async function handleReturnToRepository() {
    const ep = editModal.episode
    if (!ep) return

    setReturning(true)
    setEditError('')

    try {
      const { error } = await supabase
        .from('episodes')
        .update({
          editorial_status: 'repository',
          calendar_scheduled_at: null,
        })
        .eq('id', ep.id)
        .eq('editorial_status', 'calendar_scheduled')

      if (error) throw error

      setCalendarEpisodes((prev) => prev.filter((e) => e.id !== ep.id))
      const returnedEp: EpisodeWithSeries = { ...ep, editorial_status: 'repository', calendar_scheduled_at: null }
      setRepositoryEpisodes((prev) => [returnedEp, ...prev])
      closeEditModal()
    } catch (err) {
      console.error('Erro ao devolver ao repositório:', err)
      setEditError('Não foi possível atualizar o agendamento.')
    } finally {
      setReturning(false)
    }
  }

  // ---- Publish mutation ----
  async function handlePublish() {
    const ep = editModal.episode
    if (!ep) return

    setPublishing(true)
    setPublishError('')
    setPublishSuccess('')

    try {
      // Validate basic requirements (matches project pattern from novo-episodio)
      if (!ep.title || !ep.series_id || !ep.audio_url) {
        setPublishError('Este episódio ainda não tem todos os dados necessários para publicação.')
        setPublishing(false)
        return
      }

      const { error } = await supabase
        .from('episodes')
        .update({
          status: 'published',
          editorial_status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', ep.id)
        .eq('editorial_status', 'calendar_scheduled')

      if (error) throw error

      // Update local state — mark as published
      const updatedEp: EpisodeWithSeries = {
        ...ep,
        status: 'published',
        editorial_status: 'published',
      }
      setCalendarEpisodes((prev) => prev.map((e) => (e.id === ep.id ? updatedEp : e)))
      setEditModal((prev) => ({ ...prev, episode: updatedEp }))

      setPublishSuccess('Episódio publicado. Ele já pode aparecer no app.')
    } catch (err) {
      console.error('Erro ao publicar episódio:', err)
      setPublishError('Não foi possível publicar o episódio.')
    } finally {
      setPublishing(false)
    }
  }

  // ---- Login screen ----
  if (!isLogged) {
    return (
      <main className="admin-page">
        <section className="login-card">
          <div className="login-badge">Painel Admin</div>
          <h1>Agenda de Episódios</h1>
          <p>Acesse o painel para organizar os episódios prontos antes de publicar.</p>
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
          <Link href="/admin" className="back-link">Voltar ao painel</Link>
        </section>
        <style jsx>{styles}</style>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="admin-page">
        <div className="page-container"><div className="loading-state">Carregando agenda...</div></div>
        <style jsx>{styles}</style>
      </main>
    )
  }

  const isEpisodePublished = editModal.episode?.status === 'published'

  // ---- Main content ----
  return (
    <main className="admin-page">
      <div className="page-container">
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
            <button type="button" className="logout-button" onClick={handleLogout}>Sair</button>
          </div>
        </header>

        {loadError && <div className="alert">{loadError}</div>}

        <section className="summary-cards">
          <div className="summary-card gold">
            <div className="summary-card-icon">📦</div>
            <div><strong>{repositoryEpisodes.length}</strong><span>No repositório</span></div>
          </div>
          <div className="summary-card blue">
            <div className="summary-card-icon">📅</div>
            <div><strong>{calendarEpisodes.length}</strong><span>Agendados no calendário</span></div>
          </div>
          <div className="summary-card purple">
            <div className="summary-card-icon">🗓️</div>
            <div><strong>{scheduledThisMonth}</strong><span>Este mês</span></div>
          </div>
        </section>

        <div className="agenda-layout">
          <section className="calendar-section">
            <div className="calendar-nav">
              <button type="button" onClick={goToPreviousMonth} className="nav-button">←</button>
              <div className="month-title"><h2>{MONTHS_PT[currentMonth]} {currentYear}</h2></div>
              <button type="button" onClick={goToNextMonth} className="nav-button">→</button>
              <button type="button" onClick={goToToday} className="today-button">Hoje</button>
            </div>
            <div className="calendar-weekdays">
              {DAYS_PT.map((day) => (<div key={day} className="weekday-label">{day}</div>))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`calendar-cell ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''}`}
                  onClick={() => day.isCurrentMonth && handleDayClick(day.dateObj)}
                >
                  <span className="day-number">{day.date}</span>
                  <div className="day-episodes">
                    {day.episodes.slice(0, 2).map((ep) => (
                      <div
                        key={ep.id}
                        className={`day-episode-chip ${ep.status === 'published' ? 'published-chip' : ''}`}
                        title={ep.title}
                        onClick={(e) => handleChipClick(ep, e)}
                      >
                        <span className="chip-series">
                          {ep.series?.[0]?.title || 'Sem série'} — Ep. {ep.episode_number ?? '?'}
                        </span>
                        <span className="chip-title">{ep.title}</span>
                        {ep.status === 'published' && (
                          <span className="chip-published-label">Publicado</span>
                        )}
                      </div>
                    ))}
                    {day.episodes.length > 2 && (
                      <div className="day-episode-more">+{day.episodes.length - 2} episódios</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {calendarEpisodes.length === 0 && (
              <div className="calendar-empty-msg">Nenhum episódio agendado neste mês.</div>
            )}
          </section>

          <aside className="repository-sidebar">
            <div className="sidebar-header">
              <span className="eyebrow">Repositório</span>
              <h2>Aguardando agendamento</h2>
            </div>
            {repositoryEpisodes.length === 0 ? (
              <div className="empty-repository">Não há episódios aguardando agendamento.</div>
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
                    <Link href={`/admin/episodios/${ep.id}`} className="repo-edit-link">Abrir edição</Link>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ---- Schedule Modal ---- */}
      {modal.open && (
        <div className="modal-overlay" onClick={closeScheduleModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agendar episódio</h2>
              <button type="button" className="modal-close" onClick={closeScheduleModal}>✕</button>
            </div>
            {modal.selectedDate && (
              <p className="modal-date">Data: <strong>{formatDateBr(modal.selectedDate)}</strong></p>
            )}
            {repositoryEpisodes.length === 0 ? (
              <div className="modal-empty-msg">Não há episódios no repositório para agendar.</div>
            ) : (
              <>
                <div className="modal-field">
                  <label htmlFor="modal-episode">Episódio</label>
                  <select
                    id="modal-episode"
                    value={modal.selectedEpisodeId ?? ''}
                    onChange={(e) => handleEpisodeChange(e.target.value)}
                    className="modal-select"
                  >
                    {repositoryEpisodes.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        {ep.series?.[0]?.title || 'Sem série'} — Ep. {ep.episode_number ?? '?'} — {ep.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-field">
                  <label htmlFor="modal-time">Horário</label>
                  <input id="modal-time" type="time" value={modal.selectedTime} onChange={(e) => handleScheduleTimeChange(e.target.value)} className="modal-input" />
                </div>
                {showScheduleConflictWarning && <div className="modal-warning">Já existe um episódio nesse horário.</div>}
                {scheduleSuccess && <div className="modal-success">{scheduleSuccess}</div>}
                {scheduleError && <div className="modal-error">{scheduleError}</div>}
                <div className="modal-actions">
                  <button type="button" className="modal-cancel" onClick={closeScheduleModal} disabled={scheduling}>Cancelar</button>
                  <button type="button" className="modal-submit" onClick={handleSchedule} disabled={scheduling || !modal.selectedEpisodeId}>
                    {scheduling ? 'Agendando...' : 'Agendar episódio'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- Edit Scheduled Episode Modal ---- */}
      {editModal.open && editModal.episode && !editModal.showReturnConfirm && !editModal.showPublishConfirm && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Episódio agendado</h2>
              <button type="button" className="modal-close" onClick={closeEditModal}>✕</button>
            </div>

            <div className="edit-episode-info">
              <p className="edit-ep-title">{editModal.episode.title}</p>
              <p className="edit-ep-series">
                {editModal.episode.series?.[0]?.title || 'Sem série'} — Ep. {editModal.episode.episode_number ?? '?'}
              </p>
            </div>

            <div className="edit-current-schedule">
              <p>
                <span className="edit-label">Data atual:</span>{' '}
                {editModal.episode.calendar_scheduled_at ? formatDateBr(new Date(editModal.episode.calendar_scheduled_at)) : '—'}
              </p>
              <p>
                <span className="edit-label">Horário atual:</span>{' '}
                {editModal.episode.calendar_scheduled_at ? formatTimeForDisplay(editModal.episode.calendar_scheduled_at) : '—'}
              </p>
              {isEpisodePublished ? (
                <p className="edit-published-badge">Publicado</p>
              ) : (
                <>
                  <p className="edit-status-badge">Agendado no calendário</p>
                  <p className="edit-status-note">Este episódio ainda não está público.</p>
                </>
              )}
            </div>

            {!isEpisodePublished && (
              <>
                <div className="modal-field">
                  <label htmlFor="edit-date">Nova data</label>
                  <input id="edit-date" type="date" value={editModal.editDate} onChange={(e) => handleEditDateChange(e.target.value)} className="modal-input" />
                </div>
                <div className="modal-field">
                  <label htmlFor="edit-time">Novo horário</label>
                  <input id="edit-time" type="time" value={editModal.editTime} onChange={(e) => handleEditTimeChange(e.target.value)} className="modal-input" />
                </div>
                {showEditConflictWarning && <div className="modal-warning">Já existe um episódio nesse horário.</div>}
              </>
            )}

            {editSuccess && <div className="modal-success">{editSuccess}</div>}
            {editError && <div className="modal-error">{editError}</div>}

            {/* Publish error/success */}
            {publishError && <div className="modal-error">{publishError}</div>}
            {publishSuccess && <div className="modal-success">{publishSuccess}</div>}

            {!isEpisodePublished ? (
              <div className="edit-modal-actions">
                <button type="button" className="modal-submit" onClick={handleEditSave} disabled={editing || returning || publishing}>
                  {editing ? 'Salvando...' : 'Salvar alteração'}
                </button>

                {/* Publish section */}
                <div className="publish-section">
                  <p className="publish-label">Publicação</p>
                  <p className="publish-desc">Publique manualmente este episódio quando estiver pronto. Isso não usa o cron automático.</p>
                  <button
                    type="button"
                    className="publish-button"
                    onClick={showPublishConfirmation}
                    disabled={editing || returning || publishing}
                  >
                    {publishing ? 'Publicando...' : 'Publicar agora'}
                  </button>
                </div>

                <button type="button" className="edit-return-button" onClick={showReturnConfirmation} disabled={editing || returning || publishing}>
                  Devolver ao repositório
                </button>
                <Link href={`/admin/episodios/${editModal.episode.id}`} className="edit-open-link" onClick={closeEditModal}>
                  Abrir edição
                </Link>
                <button type="button" className="edit-cancel-button" onClick={closeEditModal} disabled={editing || returning || publishing}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="edit-modal-actions">
                <p className="publish-section">
                  <span className="publish-label">Publicado</span>
                </p>
                <Link href={`/admin/episodios/${editModal.episode.id}`} className="edit-open-link" onClick={closeEditModal}>
                  Abrir edição
                </Link>
                <button type="button" className="edit-cancel-button" onClick={closeEditModal}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Publish Confirmation Modal ---- */}
      {editModal.open && editModal.showPublishConfirm && editModal.episode && (
        <div className="modal-overlay" onClick={cancelPublish}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Publicar episódio</h2>
              <button type="button" className="modal-close" onClick={cancelPublish}>✕</button>
            </div>
            <p className="modal-confirm-text">
              Deseja publicar este episódio agora? Ele ficará visível no app.
            </p>
            <div className="edit-episode-info">
              <p className="edit-ep-title">{editModal.episode.title}</p>
            </div>
            {publishError && <div className="modal-error">{publishError}</div>}
            <div className="modal-actions">
              <button type="button" className="modal-cancel" onClick={cancelPublish} disabled={publishing}>Cancelar</button>
              <button type="button" className="publish-confirm-button" onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publicando...' : 'Sim, publicar agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Return to Repository Confirmation Modal ---- */}
      {editModal.open && editModal.showReturnConfirm && editModal.episode && !editModal.showPublishConfirm && (
        <div className="modal-overlay" onClick={cancelReturn}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Devolver ao repositório</h2>
              <button type="button" className="modal-close" onClick={cancelReturn}>✕</button>
            </div>
            <p className="modal-confirm-text">Deseja remover este episódio da agenda e devolver ao repositório?</p>
            <div className="edit-episode-info"><p className="edit-ep-title">{editModal.episode.title}</p></div>
            {editError && <div className="modal-error">{editError}</div>}
            <div className="modal-actions">
              <button type="button" className="modal-cancel" onClick={cancelReturn} disabled={returning}>Cancelar</button>
              <button type="button" className="edit-return-confirm-button" onClick={handleReturnToRepository} disabled={returning}>
                {returning ? 'Devolvendo...' : 'Sim, devolver ao repositório'}
              </button>
            </div>
          </div>
        </div>
      )}

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

  .page-container { max-width: 1280px; margin: 0 auto; }

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

  .page-header h1 { font-size: clamp(2rem, 4vw, 3.2rem); line-height: 0.98; letter-spacing: -0.07em; }
  .page-header p { color: #bfdbfe; margin-top: 12px; max-width: 680px; line-height: 1.6; }

  .header-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

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

  button:hover { transform: translateY(-1px); border-color: rgba(147, 197, 253, 0.5); background: rgba(30, 41, 59, 0.9); }
  button:disabled { cursor: not-allowed; opacity: 0.6; transform: none; }

  .logout-button { background: rgba(136, 19, 55, 0.3); border-color: rgba(244, 63, 94, 0.28); }

  .alert {
    margin-top: 22px; padding: 14px 18px; border-radius: 18px;
    background: rgba(127, 29, 29, 0.32); border: 1px solid rgba(248, 113, 113, 0.24);
    color: #fecaca; font-weight: 800;
  }

  .loading-state { margin-top: 48px; text-align: center; color: #94a3b8; font-weight: 800; font-size: 1.1rem; }

  .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }

  .summary-card {
    display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 24px;
    border: 1px solid rgba(148, 163, 184, 0.18); background: rgba(15, 23, 42, 0.78);
  }

  .summary-card-icon { width: 48px; height: 48px; border-radius: 16px; display: grid; place-items: center; font-size: 1.4rem; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); flex-shrink: 0; }
  .summary-card strong { display: block; font-size: 1.8rem; letter-spacing: -0.06em; line-height: 1; }
  .summary-card span { color: #bfdbfe; font-size: 0.78rem; font-weight: 800; text-transform: lowercase; margin-top: 4px; display: block; }

  .gold { border-color: rgba(245, 158, 11, 0.28); }
  .blue { border-color: rgba(96, 165, 250, 0.24); }
  .purple { border-color: rgba(168, 85, 247, 0.24); }

  .agenda-layout { display: grid; grid-template-columns: 1fr 340px; gap: 24px; margin-top: 28px; align-items: start; }

  .calendar-section { border-radius: 28px; border: 1px solid rgba(148, 163, 184, 0.16); background: rgba(15, 23, 42, 0.78); padding: 24px; }

  .calendar-nav { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .nav-button { width: 44px; height: 44px; padding: 0; display: grid; place-items: center; font-size: 1.2rem; border-radius: 14px; }
  .month-title { flex: 1; }
  .month-title h2 { font-size: 1.4rem; letter-spacing: -0.04em; font-weight: 900; }
  .today-button { padding: 8px 16px; font-size: 0.8rem; border-radius: 12px; background: rgba(59, 130, 246, 0.18); border-color: rgba(96, 165, 250, 0.3); }

  .calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 8px; }
  .weekday-label { text-align: center; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.06em; padding: 8px 0; }

  .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }

  .calendar-cell {
    min-height: 100px; padding: 6px; border-radius: 10px;
    background: rgba(2, 6, 23, 0.4); border: 1px solid rgba(148, 163, 184, 0.06);
    display: flex; flex-direction: column; cursor: pointer; transition: background 0.15s ease;
  }

  .calendar-cell:hover { background: rgba(30, 41, 59, 0.5); border-color: rgba(96, 165, 250, 0.2); }
  .calendar-cell.other-month { opacity: 0.3; cursor: default; }
  .calendar-cell.other-month:hover { background: rgba(2, 6, 23, 0.4); border-color: rgba(148, 163, 184, 0.06); }

  .calendar-cell.today { border-color: rgba(96, 165, 250, 0.5); background: rgba(30, 64, 175, 0.15); box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.2); }

  .day-number { font-size: 0.85rem; font-weight: 800; color: #cbd5e1; margin-bottom: 4px; display: block; }
  .calendar-cell.today .day-number { color: #93c5fd; }
  .day-episodes { display: flex; flex-direction: column; gap: 3px; flex: 1; }

  .day-episode-chip {
    padding: 3px 6px; border-radius: 6px;
    background: rgba(59, 130, 246, 0.14); border: 1px solid rgba(96, 165, 250, 0.15);
    cursor: pointer; overflow: hidden; min-height: 0; transition: background 0.15s ease;
  }

  .day-episode-chip:hover { background: rgba(59, 130, 246, 0.25); }

  .day-episode-chip.published-chip {
    background: rgba(6, 95, 70, 0.2);
    border-color: rgba(45, 212, 191, 0.25);
  }

  .chip-series { display: block; font-size: 0.6rem; font-weight: 900; color: #93c5fd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.04em; }
  .chip-title { display: block; font-size: 0.65rem; font-weight: 700; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .chip-published-label {
    display: inline-block;
    font-size: 0.5rem; font-weight: 900; color: #5eead4;
    text-transform: uppercase; letter-spacing: 0.06em;
  }

  .day-episode-more { font-size: 0.6rem; font-weight: 800; color: #a78bfa; padding: 2px 6px; }
  .calendar-empty-msg { text-align: center; padding: 32px 16px; color: #64748b; font-size: 0.9rem; font-weight: 700; }

  .repository-sidebar { border-radius: 28px; border: 1px solid rgba(148, 163, 184, 0.16); background: rgba(15, 23, 42, 0.78); padding: 24px; }
  .sidebar-header { margin-bottom: 20px; }
  .sidebar-header h2 { font-size: 1.1rem; letter-spacing: -0.04em; font-weight: 900; }

  .empty-repository { text-align: center; padding: 40px 16px; color: #64748b; font-size: 0.9rem; font-weight: 700; line-height: 1.6; border-radius: 18px; border: 1px dashed rgba(148, 163, 184, 0.1); }

  .repository-list { display: flex; flex-direction: column; gap: 12px; max-height: 70vh; overflow-y: auto; padding-right: 4px; }
  .repository-list::-webkit-scrollbar { width: 4px; }
  .repository-list::-webkit-scrollbar-track { background: transparent; }
  .repository-list::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 4px; }

  .repo-card { padding: 16px; border-radius: 18px; background: rgba(2, 6, 23, 0.5); border: 1px solid rgba(148, 163, 184, 0.1); }
  .repo-card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
  .repo-series { font-size: 0.7rem; font-weight: 800; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .repo-status-badge { font-size: 0.6rem; font-weight: 900; color: #fbbf24; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.18); border-radius: 20px; padding: 2px 8px; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.06em; }

  .repo-title { font-size: 0.95rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1.3; margin-bottom: 6px; }
  .repo-date { font-size: 0.7rem; color: #94a3b8; font-weight: 600; margin-bottom: 12px; }

  .repo-edit-link { display: inline-block; padding: 8px 16px; border-radius: 12px; background: rgba(59, 130, 246, 0.14); border: 1px solid rgba(96, 165, 250, 0.2); color: #93c5fd; font-size: 0.75rem; font-weight: 900; text-decoration: none; transition: background 0.2s ease; }
  .repo-edit-link:hover { background: rgba(59, 130, 246, 0.25); }

  .modal-overlay { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }

  .modal-content { width: min(100%, 480px); background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 28px; padding: 28px; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5); max-height: 90vh; overflow-y: auto; }

  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .modal-header h2 { font-size: 1.3rem; letter-spacing: -0.04em; font-weight: 900; }

  .modal-close { width: 36px; height: 36px; padding: 0; display: grid; place-items: center; border-radius: 12px; font-size: 1rem; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(15, 23, 42, 0.6); }

  .modal-date { font-size: 0.95rem; color: #bfdbfe; margin-bottom: 20px; padding: 12px 16px; border-radius: 14px; background: rgba(30, 64, 175, 0.12); border: 1px solid rgba(96, 165, 250, 0.15); }
  .modal-date strong { color: #f8fafc; }

  .modal-field { margin-bottom: 16px; }
  .modal-field label { display: block; color: #dbeafe; font-weight: 900; font-size: 0.82rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }

  .modal-select, .modal-input { width: 100%; border: 1px solid rgba(148, 163, 184, 0.22); background: rgba(2, 6, 23, 0.7); color: #f8fafc; border-radius: 14px; padding: 12px 14px; outline: none; font-size: 0.9rem; font-weight: 700; }
  .modal-select:focus, .modal-input:focus { border-color: rgba(96, 165, 250, 0.6); background: rgba(2, 6, 23, 0.9); }
  .modal-select option { background: #0f172a; color: #f8fafc; }

  .modal-warning { padding: 10px 14px; border-radius: 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 0.82rem; font-weight: 800; margin-bottom: 16px; }

  .modal-success { padding: 10px 14px; border-radius: 12px; background: rgba(6, 95, 70, 0.2); border: 1px solid rgba(45, 212, 191, 0.2); color: #5eead4; font-size: 0.82rem; font-weight: 800; margin-bottom: 16px; }

  .modal-error { padding: 10px 14px; border-radius: 12px; background: rgba(127, 29, 29, 0.25); border: 1px solid rgba(248, 113, 113, 0.2); color: #fca5a5; font-size: 0.82rem; font-weight: 800; margin-bottom: 16px; }

  .modal-empty-msg { text-align: center; padding: 40px 16px; color: #64748b; font-size: 0.9rem; font-weight: 700; line-height: 1.6; }

  .modal-actions { display: flex; gap: 12px; margin-top: 8px; }

  .modal-cancel { flex: 1; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(15, 23, 42, 0.6); color: #94a3b8; border-radius: 14px; padding: 14px; font-weight: 900; font-size: 0.95rem; }

  .modal-submit { flex: 1; border: 1px solid rgba(96, 165, 250, 0.3); background: rgba(37, 99, 235, 0.4); color: #f8fafc; border-radius: 14px; padding: 14px; font-weight: 900; font-size: 0.95rem; }
  .modal-submit:hover { background: rgba(37, 99, 235, 0.6); border-color: rgba(96, 165, 250, 0.5); }
  .modal-cancel:hover { background: rgba(15, 23, 42, 0.85); border-color: rgba(148, 163, 184, 0.35); }

  .edit-episode-info { padding: 12px 16px; background: rgba(30, 64, 175, 0.08); border: 1px solid rgba(96, 165, 250, 0.12); border-radius: 16px; margin-bottom: 16px; }
  .edit-ep-title { font-size: 1.05rem; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 4px; }
  .edit-ep-series { font-size: 0.75rem; color: #93c5fd; font-weight: 800; }

  .edit-current-schedule { padding: 12px 16px; border-radius: 14px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.1); margin-bottom: 16px; }
  .edit-current-schedule p { font-size: 0.85rem; color: #bfdbfe; margin-bottom: 6px; }
  .edit-label { color: #94a3b8; font-weight: 700; }

  .edit-status-badge { display: inline-block; font-size: 0.65rem; font-weight: 900; color: #60a5fa; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(96, 165, 250, 0.18); border-radius: 20px; padding: 2px 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 8px; }

  .edit-published-badge { display: inline-block; font-size: 0.65rem; font-weight: 900; color: #5eead4; background: rgba(45, 212, 191, 0.12); border: 1px solid rgba(45, 212, 191, 0.18); border-radius: 20px; padding: 2px 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 8px; }

  .edit-status-note { font-size: 0.75rem !important; color: #64748b !important; margin-top: 6px !important; font-weight: 700 !important; }

  /* Publish section */
  .publish-section { padding: 14px; border-radius: 14px; background: rgba(6, 95, 70, 0.08); border: 1px solid rgba(45, 212, 191, 0.15); margin-top: 4px; }
  .publish-label { font-size: 0.7rem; font-weight: 900; color: #5eead4; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
  .publish-desc { font-size: 0.75rem; color: #94a3b8; font-weight: 600; margin-bottom: 10px; line-height: 1.4; }

  .publish-button { width: 100%; border: 1px solid rgba(45, 212, 191, 0.3); background: rgba(45, 212, 191, 0.12); color: #5eead4; border-radius: 14px; padding: 14px; font-weight: 900; font-size: 0.9rem; cursor: pointer; transition: background 0.2s ease; }
  .publish-button:hover { background: rgba(45, 212, 191, 0.22); }

  .publish-confirm-button { flex: 1; border: 1px solid rgba(45, 212, 191, 0.3); background: rgba(45, 212, 191, 0.15); color: #5eead4; border-radius: 14px; padding: 14px; font-weight: 900; font-size: 0.95rem; }
  .publish-confirm-button:hover { background: rgba(45, 212, 191, 0.25); }

  .edit-modal-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }

  .edit-modal-actions button, .edit-modal-actions a { width: 100%; text-align: center; border-radius: 14px; padding: 14px; font-weight: 900; font-size: 0.9rem; cursor: pointer; transition: background 0.2s ease, border-color 0.2s ease; border: 1px solid rgba(148, 163, 184, 0.2); text-decoration: none; }

  .edit-return-button { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2) !important; color: #fbbf24; }
  .edit-return-button:hover { background: rgba(245, 158, 11, 0.2); }

  .edit-open-link { background: rgba(59, 130, 246, 0.1); border-color: rgba(96, 165, 250, 0.2) !important; color: #93c5fd; display: block; }
  .edit-open-link:hover { background: rgba(59, 130, 246, 0.2); }

  .edit-cancel-button { background: rgba(15, 23, 42, 0.6); color: #94a3b8; }
  .edit-cancel-button:hover { background: rgba(15, 23, 42, 0.85); border-color: rgba(148, 163, 184, 0.35); }

  .edit-return-confirm-button { flex: 1; border: 1px solid rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-radius: 14px; padding: 14px; font-weight: 900; font-size: 0.95rem; }
  .edit-return-confirm-button:hover { background: rgba(245, 158, 11, 0.25); }

  .modal-confirm-text { font-size: 1rem; color: #e2e8f0; font-weight: 700; line-height: 1.5; margin-bottom: 16px; text-align: center; }

  .login-card { width: min(100%, 460px); margin: 9vh auto 0; padding: 34px; border-radius: 32px; background: rgba(15, 23, 42, 0.84); border: 1px solid rgba(148, 163, 184, 0.18); box-shadow: 0 24px 90px rgba(0, 0, 0, 0.35); }
  .login-badge { display: inline-flex; border-radius: 999px; padding: 7px 12px; background: rgba(59, 130, 246, 0.14); color: #93c5fd; font-size: 0.76rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 18px; }
  .login-card h1 { font-size: 2.4rem; letter-spacing: -0.07em; line-height: 1; }
  .login-card p { color: #bfdbfe; line-height: 1.65; margin: 14px 0 24px; }
  form { display: grid; gap: 12px; }
  label { color: #dbeafe; font-weight: 900; font-size: 0.86rem; }
  input { width: 100%; border: 1px solid rgba(148, 163, 184, 0.22); background: rgba(2, 6, 23, 0.58); color: #f8fafc; border-radius: 16px; padding: 14px 16px; outline: none; }
  input:focus { border-color: rgba(96, 165, 250, 0.6); background: rgba(2, 6, 23, 0.8); }
  button[type="submit"] { margin-top: 4px; background: rgba(37, 99, 235, 0.5); border-color: rgba(96, 165, 250, 0.36); font-size: 1rem; padding: 16px; }
  .form-error { color: #fca5a5; font-size: 0.82rem; font-weight: 800; }
  .back-link { display: block; margin-top: 20px; color: #94a3b8; font-weight: 800; font-size: 0.85rem; text-align: center; text-decoration: none; }
  .back-link:hover { color: #cbd5e1; }

  @media (max-width: 900px) { .agenda-layout { grid-template-columns: 1fr; } .summary-cards { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 600px) { .summary-cards { grid-template-columns: 1fr; } .calendar-cell { min-height: 70px; padding: 4px; } .day-episode-chip { display: none; } .calendar-cell.today .day-episode-chip { display: block; } }
`