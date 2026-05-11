export type BetaMissionCriticality = 'baixa' | 'média' | 'alta'

export type BetaMissionType =
  | 'navegação'
  | 'áudio'
  | 'conteúdo'
  | 'compartilhamento'
  | 'notificação'
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

export type MissionResultStatus = 'success' | 'problem' | 'confusing' | 'postponed'

export type MissionResult = {
  status: MissionResultStatus
  report?: string
}
