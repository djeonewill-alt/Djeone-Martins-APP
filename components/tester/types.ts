export type BetaMissionCriticality = 'baixa' | 'média' | 'alta'

export type BetaMissionType =
  | 'navegação'
  | 'navegação/usabilidade'
  | 'áudio'
  | 'conteúdo'
  | 'conteúdo/usabilidade'
  | 'compartilhamento'
  | 'notificação'
  | 'persistência/usabilidade'
  | 'privacidade'
  | 'segurança pastoral'
  | 'interação comunitária'
  | 'moderação'
  | 'recurso futuro'
  | 'contribuição'
  | 'premium'
  | 'beta'
  | 'usabilidade'
  | 'espiritual/pastoral'

export type BetaMission = {
  app_area: string
  section: string
  mission_key: string
  area: string
  title: string
  estimated_minutes: number
  objective: string
  prerequisites: string[]
  step_by_step: string[]
  what_to_observe: string[]
  success_criteria: string
  problem_criteria: string
  confusing_criteria: string
  criticality: BetaMissionCriticality
  type: BetaMissionType
}

export type MissionResultStatus =
  | 'started'
  | 'success'
  | 'problem'
  | 'confusing'
  | 'postponed'

export type MissionResult = {
  id?: string
  auth_user_id?: string
  status: MissionResultStatus
  report?: string
  technical_snapshot?: unknown
  started_at?: string | null
  completed_at?: string | null
  updated_at?: string | null
}
