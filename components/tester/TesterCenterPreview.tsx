'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { betaMissions } from './betaMissions'
import type { BetaMission, MissionResult, MissionResultStatus } from './types'

type TesterCenterPreviewProps = {
  onBack: () => void
}

type MissionFlow = 'intro' | 'started' | 'postponed' | 'completed'

type AppAreaSummary = {
  appArea: string
  description: string
  missions: BetaMission[]
  sections: SectionSummary[]
  totalMinutes: number
  completedCount: number
  responseCount: number
}

type SectionSummary = {
  section: string
  description: string
  missions: BetaMission[]
  totalMinutes: number
  completedCount: number
  responseCount: number
  isComingSoon?: boolean
}

const appAreaOrder = [
  'Aba Hoje',
  'Aba Leitura',
  'Aba Oração',
  'Aba Você',
  'Aba Mais',
  'Configurações / Conta',
]

const appAreaDescriptions: Record<string, string> = {
  'Aba Hoje':
    'Teste a experiência inicial: Palavra do Dia, áudio, atalhos, lembrete e compartilhamento.',
  'Aba Leitura':
    'Teste planos de leitura, progresso diário e clareza dos textos.',
  'Aba Oração':
    'Teste guias de oração, pedidos e experiência pastoral.',
  'Aba Você':
    'Teste perfil, favoritos, histórico e progresso pessoal.',
  'Aba Mais':
    'Teste os caminhos extras do app: podcasts, oferta, jornadas, projetos e recursos futuros.',
  'Configurações / Conta':
    'Teste conta, preferências, notificações e informações técnicas.',
}

const sectionDescriptions: Record<string, string> = {
  'Visão geral':
    'Teste se a área apresenta bem os recursos extras e caminhos principais do app.',
  'Áudio de Hoje':
    'Teste o card do áudio, Mini Player, favoritos e comportamento em aparelhos reais.',
  'Compartilhamento':
    'Teste os caminhos para compartilhar Palavra do Dia e Áudio de Hoje.',
  Atalhos:
    'Teste os caminhos da Aba Hoje para leitura, oração, oferta e séries.',
  Notificações:
    'Teste lembretes e mensagens de permissão quando disponíveis.',
  Hoje:
    'Teste a leitura do dia, marcação de capítulos e orientação para começar.',
  Planos:
    'Teste a escolha de planos, início de jornada e troca de plano ativo.',
  Bíblia:
    'Teste a navegação livre por testamento, livro e capítulos.',
  Progresso:
    'Teste dashboard, percentuais, persistência e clareza do progresso bíblico.',
  'Podcasts devocionais':
    'Teste séries, episódios, player e controles de áudio dentro da Aba Mais.',
  Oferta:
    'Testes de contribuição serão preparados em uma próxima etapa.',
  Vídeos:
    'Testes de vídeos serão preparados quando a área estiver ativa.',
  'Missões e projetos':
    'Testes de projetos ministeriais serão preparados quando a área estiver ativa.',
  'Jornadas Premium':
    'Testes de jornadas guiadas serão preparados quando a área estiver ativa.',
  'Central do Testador':
    'Testes da própria central serão preparados conforme a experiência evoluir.',
  Configurações:
    'Teste se fica claro que conta, notificações e preferências ficam na engrenagem.',
}

const abaMaisSections = [
  'Visão geral',
  'Podcasts devocionais',
  'Oferta',
  'Vídeos',
  'Missões e projetos',
  'Jornadas Premium',
  'Central do Testador',
  'Configurações',
]

const abaLeituraSections = ['Hoje', 'Planos', 'Bíblia', 'Progresso']

const statusLabels: Record<MissionResultStatus, string> = {
  success: 'Concluída',
  problem: 'Relato enviado',
  confusing: 'Relato enviado',
  postponed: 'Deixada para depois',
}

function getCriticalityClasses(criticality: BetaMission['criticality']) {
  if (criticality === 'alta') {
    return 'border-red-300/20 bg-red-500/10 text-red-100'
  }

  if (criticality === 'média') {
    return 'border-amber-300/20 bg-amber-500/10 text-amber-100'
  }

  return 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
}

function isCompleted(result?: MissionResult) {
  return result?.status === 'success' || result?.status === 'problem' || result?.status === 'confusing'
}

function getMissionStatus(result?: MissionResult) {
  if (!result) return 'Pendente'
  return statusLabels[result.status]
}

function groupMissionsByAppArea(missions: BetaMission[]) {
  return missions.reduce<Record<string, BetaMission[]>>((groups, mission) => {
    const appArea = mission.app_area || mission.area

    if (!groups[appArea]) {
      groups[appArea] = []
    }

    groups[appArea].push(mission)
    return groups
  }, {})
}

function getSectionSummaries(
  appArea: string,
  missions: BetaMission[],
  missionResults: Record<string, MissionResult>
) {
  const sectionNames =
    appArea === 'Aba Mais'
      ? abaMaisSections
      : appArea === 'Aba Leitura'
        ? abaLeituraSections
      : Array.from(new Set(missions.map((mission) => mission.section || mission.area)))

  return sectionNames.map((section) => {
    const sectionMissions = missions.filter((mission) => mission.section === section)
    const totalMinutes = sectionMissions.reduce(
      (total, mission) => total + mission.estimated_minutes,
      0
    )
    const completedCount = sectionMissions.filter((mission) =>
      isCompleted(missionResults[mission.mission_key])
    ).length
    const responseCount = sectionMissions.filter((mission) =>
      Boolean(missionResults[mission.mission_key])
    ).length

    return {
      section,
      description:
        sectionDescriptions[section] ||
        'Testes desta seção serão preparados conforme o app evoluir.',
      missions: sectionMissions,
      totalMinutes,
      completedCount,
      responseCount,
      isComingSoon: sectionMissions.length === 0,
    }
  })
}

function getAppAreaSummaries(
  missionResults: Record<string, MissionResult>
) {
  const missionsByAppArea = groupMissionsByAppArea(betaMissions)

  return appAreaOrder.map((appArea) => {
    const missions = missionsByAppArea[appArea] || []
    const totalMinutes = missions.reduce(
      (total, mission) => total + mission.estimated_minutes,
      0
    )
    const completedCount = missions.filter((mission) =>
      isCompleted(missionResults[mission.mission_key])
    ).length
    const responseCount = missions.filter((mission) =>
      Boolean(missionResults[mission.mission_key])
    ).length

    return {
      appArea,
      description:
        appAreaDescriptions[appArea] ||
        'Teste esta área do app com missões guiadas e relatos simples.',
      missions,
      sections: getSectionSummaries(appArea, missions, missionResults),
      totalMinutes,
      completedCount,
      responseCount,
    }
  })
}

export default function TesterCenterPreview({ onBack }: TesterCenterPreviewProps) {
  const [selectedAppArea, setSelectedAppArea] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedMissionKey, setSelectedMissionKey] = useState<string | null>(null)
  const [missionFlow, setMissionFlow] = useState<MissionFlow>('intro')
  const [selectedResult, setSelectedResult] = useState<MissionResultStatus | null>(null)
  const [reportText, setReportText] = useState('')
  const [missionResults, setMissionResults] = useState<Record<string, MissionResult>>({})

  const appAreaSummaries = useMemo(
    () => getAppAreaSummaries(missionResults),
    [missionResults]
  )

  const selectedAreaSummary = selectedAppArea
    ? appAreaSummaries.find((summary) => summary.appArea === selectedAppArea) || null
    : null
  const selectedSectionSummary =
    selectedAreaSummary && selectedSection
      ? selectedAreaSummary.sections.find((summary) => summary.section === selectedSection) || null
      : null
  const selectedMission = selectedMissionKey
    ? betaMissions.find((mission) => mission.mission_key === selectedMissionKey) || null
    : null

  const completedMissions = betaMissions.filter((mission) =>
    isCompleted(missionResults[mission.mission_key])
  ).length
  const responseCount = Object.keys(missionResults).length
  const areasInTest = appAreaSummaries.filter((summary) => summary.missions.length > 0).length

  const resetTemporaryMissionState = () => {
    setMissionFlow('intro')
    setSelectedResult(null)
    setReportText('')
  }

  const openAppArea = (appArea: string) => {
    setSelectedAppArea(appArea)
    setSelectedSection(null)
    setSelectedMissionKey(null)
    resetTemporaryMissionState()
  }

  const openSection = (section: string) => {
    setSelectedSection(section)
    setSelectedMissionKey(null)
    resetTemporaryMissionState()
  }

  const openMission = (missionKey: string) => {
    setSelectedMissionKey(missionKey)
    resetTemporaryMissionState()
  }

  const backToHome = () => {
    setSelectedAppArea(null)
    setSelectedSection(null)
    setSelectedMissionKey(null)
    resetTemporaryMissionState()
  }

  const backToArea = () => {
    setSelectedSection(null)
    setSelectedMissionKey(null)
    resetTemporaryMissionState()
  }

  const backToMissionList = () => {
    setSelectedMissionKey(null)
    resetTemporaryMissionState()
  }

  const postponeMission = () => {
    if (!selectedMission) return

    setMissionResults((current) => ({
      ...current,
      [selectedMission.mission_key]: { status: 'postponed' },
    }))
    setSelectedResult('postponed')
    setMissionFlow('postponed')
  }

  const handleResult = (status: MissionResultStatus) => {
    if (!selectedMission || status === 'postponed') return

    setSelectedResult(status)

    if (status === 'success') {
      setMissionResults((current) => ({
        ...current,
        [selectedMission.mission_key]: { status },
      }))
      setMissionFlow('completed')
    }
  }

  const handleSaveReport = () => {
    if (!selectedMission || !selectedResult || selectedResult === 'postponed') return

    setMissionResults((current) => ({
      ...current,
      [selectedMission.mission_key]: {
        status: selectedResult,
        report: reportText.trim(),
      },
    }))
    setMissionFlow('completed')
  }

  const currentMissionList =
    selectedSectionSummary?.missions ||
    selectedAreaSummary?.missions ||
    []

  const handleNextMission = () => {
    if (!selectedMission || currentMissionList.length === 0) return

    const currentIndex = currentMissionList.findIndex(
      (mission) => mission.mission_key === selectedMission.mission_key
    )
    const nextMission = currentMissionList[currentIndex + 1] || currentMissionList[0]

    openMission(nextMission.mission_key)
  }

  if (selectedMission && selectedAreaSummary) {
    return (
      <MissionDetail
        mission={selectedMission}
        missionFlow={missionFlow}
        selectedResult={selectedResult}
        reportText={reportText}
        savedResult={missionResults[selectedMission.mission_key]}
        backLabel={
          selectedSectionSummary
            ? 'Voltar para missões da subárea'
            : 'Voltar para testes da área'
        }
        onBack={backToMissionList}
        onStart={() => {
          setMissionFlow('started')
          setSelectedResult(null)
          setReportText('')
        }}
        onPostpone={postponeMission}
        onResult={handleResult}
        onReportChange={setReportText}
        onSaveReport={handleSaveReport}
        onNextMission={handleNextMission}
        onBackToList={backToMissionList}
        onStop={backToHome}
      />
    )
  }

  if (selectedAreaSummary && selectedSectionSummary) {
    return (
      <MissionList
        title={selectedSectionSummary.section}
        eyebrow={selectedAreaSummary.appArea}
        description={selectedSectionSummary.description}
        missions={selectedSectionSummary.missions}
        completedCount={selectedSectionSummary.completedCount}
        totalMinutes={selectedSectionSummary.totalMinutes}
        missionResults={missionResults}
        onBack={backToArea}
        backLabel="Voltar para subáreas"
        onOpenMission={openMission}
      />
    )
  }

  if (selectedAreaSummary) {
    if (selectedAreaSummary.appArea === 'Aba Mais') {
      return (
        <AppAreaSections
          summary={selectedAreaSummary}
          onBack={backToHome}
          onOpenSection={openSection}
        />
      )
    }

    return (
      <MissionList
        title={selectedAreaSummary.appArea}
        eyebrow="Área de teste"
        description={selectedAreaSummary.description}
        missions={selectedAreaSummary.missions}
        completedCount={selectedAreaSummary.completedCount}
        totalMinutes={selectedAreaSummary.totalMinutes}
        missionResults={missionResults}
        onBack={backToHome}
        backLabel="Voltar para áreas"
        onOpenMission={openMission}
      />
    )
  }

  return (
    <TesterHome
      summaries={appAreaSummaries}
      missionCount={betaMissions.length}
      completedCount={completedMissions}
      responseCount={responseCount}
      areasInTest={areasInTest}
      onBack={onBack}
      onOpenArea={openAppArea}
    />
  )
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-4 text-white">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  )
}

function TesterHome({
  summaries,
  missionCount,
  completedCount,
  responseCount,
  areasInTest,
  onBack,
  onOpenArea,
}: {
  summaries: AppAreaSummary[]
  missionCount: number
  completedCount: number
  responseCount: number
  areasInTest: number
  onBack: () => void
  onOpenArea: (appArea: string) => void
}) {
  return (
    <PageShell>
      <BackButton onClick={onBack}>Voltar para Mais</BackButton>

      <section className="overflow-hidden rounded-[34px] border border-purple-300/20 bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/40 p-6 shadow-2xl shadow-purple-950/20">
        <div className="inline-flex rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-purple-100">
          Beta fechado
        </div>

        <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.075em] text-white">
          Central do Testador
        </h1>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
          Obrigado por ajudar a melhorar o app. Seu tempo e suas respostas nos ajudam
          a preparar uma experiência mais clara, estável e edificante para todos.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard value={missionCount} label="Missões disponíveis" />
          <StatCard value={completedCount} label="Missões concluídas" />
          <StatCard value={responseCount} label="Respostas nesta sessão" />
          <StatCard value={areasInTest} label="Áreas em teste" />
        </div>
      </section>

      <section className="mt-5 grid gap-4">
        {summaries.map((summary) => (
          <button
            key={summary.appArea}
            type="button"
            onClick={() => onOpenArea(summary.appArea)}
            className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5 text-left shadow-2xl shadow-black/20 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-white">
                  {summary.appArea}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                  {summary.description}
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-purple-100">
                Ver testes
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {summary.missions.length > 0 ? (
                <>
                  <InfoPill>{summary.missions.length} testes</InfoPill>
                  <InfoPill>cerca de {summary.totalMinutes} min</InfoPill>
                  <InfoPill>{summary.completedCount} concluídos</InfoPill>
                </>
              ) : (
                <InfoPill>Em preparação</InfoPill>
              )}
            </div>
          </button>
        ))}
      </section>
    </PageShell>
  )
}

function AppAreaSections({
  summary,
  onBack,
  onOpenSection,
}: {
  summary: AppAreaSummary
  onBack: () => void
  onOpenSection: (section: string) => void
}) {
  return (
    <PageShell>
      <BackButton onClick={onBack}>Voltar para áreas</BackButton>

      <AreaHero
        eyebrow="Área de teste"
        title={summary.appArea}
        description={summary.description}
        missionCount={summary.missions.length}
        completedCount={summary.completedCount}
        totalMinutes={summary.totalMinutes}
      />

      <section className="mt-5 grid gap-3">
        {summary.sections.map((section) => (
          <button
            key={section.section}
            type="button"
            disabled={section.isComingSoon}
            onClick={() => onOpenSection(section.section)}
            className="rounded-[26px] border border-white/10 bg-slate-900/70 p-5 text-left active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-[-0.04em] text-white">
                  {section.section}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                  {section.description}
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-200">
                {section.isComingSoon ? 'Em preparação' : 'Ver testes'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {section.isComingSoon ? (
                <InfoPill>Sem missão ativa ainda</InfoPill>
              ) : (
                <>
                  <InfoPill>{section.missions.length} testes</InfoPill>
                  <InfoPill>cerca de {section.totalMinutes} min</InfoPill>
                  <InfoPill>{section.completedCount} concluídos</InfoPill>
                </>
              )}
            </div>
          </button>
        ))}
      </section>
    </PageShell>
  )
}

function MissionList({
  title,
  eyebrow,
  description,
  missions,
  completedCount,
  totalMinutes,
  missionResults,
  onBack,
  backLabel,
  onOpenMission,
}: {
  title: string
  eyebrow: string
  description: string
  missions: BetaMission[]
  completedCount: number
  totalMinutes: number
  missionResults: Record<string, MissionResult>
  onBack: () => void
  backLabel: string
  onOpenMission: (missionKey: string) => void
}) {
  return (
    <PageShell>
      <BackButton onClick={onBack}>{backLabel}</BackButton>

      <AreaHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        missionCount={missions.length}
        completedCount={completedCount}
        totalMinutes={totalMinutes}
      />

      <section className="mt-5 grid gap-3">
        {missions.map((mission) => {
          const result = missionResults[mission.mission_key]

          return (
            <button
              key={mission.mission_key}
              type="button"
              onClick={() => onOpenMission(mission.mission_key)}
              className="rounded-[26px] border border-white/10 bg-slate-900/70 p-5 text-left active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-200">
                    {mission.section}
                  </p>
                  <h2 className="mt-2 text-lg font-black tracking-[-0.04em] text-white">
                    {mission.title}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                    {mission.objective}
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-200">
                  Testar
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <InfoPill>{mission.estimated_minutes} min</InfoPill>
                <InfoPill>{mission.type}</InfoPill>
                <span className={`rounded-full border px-3 py-2 text-xs font-black ${getCriticalityClasses(mission.criticality)}`}>
                  {mission.criticality}
                </span>
                <InfoPill>{getMissionStatus(result)}</InfoPill>
              </div>
            </button>
          )
        })}
      </section>
    </PageShell>
  )
}

function MissionDetail({
  mission,
  missionFlow,
  selectedResult,
  reportText,
  savedResult,
  backLabel,
  onBack,
  onStart,
  onPostpone,
  onResult,
  onReportChange,
  onSaveReport,
  onNextMission,
  onBackToList,
  onStop,
}: {
  mission: BetaMission
  missionFlow: MissionFlow
  selectedResult: MissionResultStatus | null
  reportText: string
  savedResult?: MissionResult
  backLabel: string
  onBack: () => void
  onStart: () => void
  onPostpone: () => void
  onResult: (status: MissionResultStatus) => void
  onReportChange: (value: string) => void
  onSaveReport: () => void
  onNextMission: () => void
  onBackToList: () => void
  onStop: () => void
}) {
  return (
    <PageShell>
      <BackButton onClick={onBack}>{backLabel}</BackButton>

      <section className="rounded-[34px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200">
              {mission.app_area} · {mission.section}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-none tracking-[-0.06em] text-white">
              {mission.title}
            </h1>
          </div>

          <span className="rounded-full border border-purple-300/20 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-purple-100">
            {mission.estimated_minutes} min
          </span>
        </div>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
          {mission.objective}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <InfoPill>{mission.app_area}</InfoPill>
          <InfoPill>{mission.section}</InfoPill>
          <InfoPill>{mission.type}</InfoPill>
          <span className={`rounded-full border px-3 py-2 text-xs font-black ${getCriticalityClasses(mission.criticality)}`}>
            Criticidade {mission.criticality}
          </span>
        </div>

        {savedResult && missionFlow === 'intro' && (
          <div className="mt-5 rounded-[22px] border border-emerald-300/20 bg-emerald-500/10 p-4">
            <p className="text-sm font-black text-emerald-100">
              Status local: {getMissionStatus(savedResult)}
            </p>
            {savedResult.report && (
              <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/80">
                {savedResult.report}
              </p>
            )}
          </div>
        )}

        {missionFlow === 'intro' && (
          <div className="mt-5 space-y-4">
            <InfoBlock
              title="Pré-requisitos"
              items={mission.prerequisites}
              keyPrefix={`${mission.mission_key}-prerequisite`}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onStart}
                className="rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-purple-950/30 active:scale-[0.98]"
              >
                Tenho esse tempo. Começar agora
              </button>
              <button
                type="button"
                onClick={onPostpone}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-black text-slate-100 active:scale-[0.98]"
              >
                Deixar para depois
              </button>
            </div>
          </div>
        )}

        {missionFlow === 'started' && (
          <div className="mt-5 space-y-4">
            <InfoBlock
              title="Pré-requisitos"
              items={mission.prerequisites}
              keyPrefix={`${mission.mission_key}-prerequisite`}
            />
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-black text-white">Passo a passo</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6 text-slate-300">
                {mission.step_by_step.map((step, index) => (
                  <li key={`${mission.mission_key}-step-${index}`}>{step}</li>
                ))}
              </ol>
            </div>
            <InfoBlock
              title="O que observar"
              items={mission.what_to_observe}
              keyPrefix={`${mission.mission_key}-observe`}
            />

            <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
              <p className="text-sm font-black text-white">Como foi o teste?</p>
              <div className="mt-4 grid gap-3">
                <ResultButton
                  label="Funcionou"
                  description={mission.success_criteria}
                  color="emerald"
                  onClick={() => onResult('success')}
                />
                <ResultButton
                  label="Deu problema"
                  description={mission.problem_criteria}
                  color="red"
                  onClick={() => onResult('problem')}
                />
                <ResultButton
                  label="Não entendi"
                  description={mission.confusing_criteria}
                  color="amber"
                  onClick={() => onResult('confusing')}
                />
              </div>

              {(selectedResult === 'problem' || selectedResult === 'confusing') && (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                    Conte o que aconteceu enquanto está fresco na memória.
                  </label>
                  <textarea
                    value={reportText}
                    onChange={(event) => onReportChange(event.target.value)}
                    rows={4}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-purple-300/60"
                    placeholder="Conte em poucas palavras o que aconteceu."
                  />
                  <button
                    type="button"
                    onClick={onSaveReport}
                    className="mt-3 rounded-2xl bg-purple-600 px-5 py-3 text-xs font-black text-white active:scale-[0.98]"
                  >
                    Salvar relato local
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {missionFlow === 'postponed' && (
          <div className="mt-5 rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-4">
            <p className="text-sm font-black text-amber-100">
              Missão deixada para depois
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-amber-50/80">
              Sem problema. Futuramente o app poderá lembrar você de continuar os testes pendentes.
            </p>
            <button
              type="button"
              onClick={onBackToList}
              className="mt-4 rounded-2xl border border-white/10 bg-slate-950 px-5 py-3 text-xs font-black text-slate-100 active:scale-[0.98]"
            >
              Voltar para a lista
            </button>
          </div>
        )}

        {missionFlow === 'completed' && selectedResult && (
          <div className="mt-5 rounded-[24px] border border-emerald-300/20 bg-emerald-500/10 p-4">
            <p className="text-sm font-black text-emerald-100">
              Obrigado. Sua resposta ajuda a melhorar o app.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/80">
              Resultado salvo localmente nesta sessão: {getMissionStatus({ status: selectedResult })}.
            </p>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={onNextMission}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black text-white active:scale-[0.98]"
              >
                Fazer próximo teste desta lista
              </button>
              <button
                type="button"
                onClick={onBackToList}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-3 text-xs font-black text-slate-100 active:scale-[0.98]"
              >
                Voltar para a lista
              </button>
              <button
                type="button"
                onClick={onStop}
                className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-3 text-xs font-black text-slate-100 active:scale-[0.98]"
              >
                Parar por enquanto
              </button>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  )
}

function AreaHero({
  eyebrow,
  title,
  description,
  missionCount,
  completedCount,
  totalMinutes,
}: {
  eyebrow: string
  title: string
  description: string
  missionCount: number
  completedCount: number
  totalMinutes: number
}) {
  return (
    <section className="rounded-[34px] border border-blue-300/20 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-black leading-none tracking-[-0.06em] text-white">
        {title}
      </h1>
      <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
        {description}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatCard value={missionCount} label="Testes" />
        <StatCard value={completedCount} label="Concluídos" />
        <StatCard value={totalMinutes} label="Minutos" />
      </div>
    </section>
  )
}

function BackButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-slate-200 active:scale-[0.98]"
    >
      <span aria-hidden="true">←</span>
      {children}
    </button>
  )
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">
        {label}
      </p>
    </div>
  )
}

function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200">
      {children}
    </span>
  )
}

function InfoBlock({
  title,
  items,
  keyPrefix,
}: {
  title: string
  items: string[]
  keyPrefix: string
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-300">
        {items.map((item, index) => (
          <li key={`${keyPrefix}-${index}`}>• {item}</li>
        ))}
      </ul>
    </div>
  )
}

function ResultButton({
  label,
  description,
  color,
  onClick,
}: {
  label: string
  description: string
  color: 'emerald' | 'red' | 'amber'
  onClick: () => void
}) {
  const classes = {
    emerald: 'bg-emerald-600',
    red: 'bg-red-600',
    amber: 'bg-amber-600',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left text-xs font-black text-white active:scale-[0.98] ${classes[color]}`}
    >
      <span className="block text-sm">{label}</span>
      <span className="mt-1 block font-semibold leading-5 text-white/86">
        {description}
      </span>
    </button>
  )
}
