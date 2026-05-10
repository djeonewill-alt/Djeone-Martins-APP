import type { PremiumIconTone } from '@/components/icons/PremiumIconTile'
import type { GamificationSvgIconName } from '@/components/icons/GamificationSvgIcon'

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond'

export type AchievementDefinition = {
  key: string
  title: string
  spiritualName: string
  description: string
  icon: GamificationSvgIconName
  tone: PremiumIconTone
  tiers: Array<{
    tier: AchievementTier
    label: string
    target: number
  }>
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: 'listener',
    title: 'Ouvinte Fiel',
    spiritualName: 'Alimente-se diariamente da Palavra',
    description: 'Constância em ouvir devocionais, episódios e conteúdos bíblicos.',
    icon: 'listener',
    tone: 'sky',
    tiers: [
      { tier: 'bronze', label: 'Bronze', target: 7 },
      { tier: 'silver', label: 'Prata', target: 30 },
      { tier: 'gold', label: 'Ouro', target: 180 },
      { tier: 'diamond', label: 'Diamante', target: 365 },
    ],
  },
  {
    key: 'intercessor',
    title: 'Intercessor',
    spiritualName: 'Carregue pessoas em oração',
    description: 'Ore por pedidos da comunidade e fortaleça pessoas diante de Deus.',
    icon: 'intercessor',
    tone: 'cyan',
    tiers: [
      { tier: 'bronze', label: 'Bronze', target: 10 },
      { tier: 'silver', label: 'Prata', target: 50 },
      { tier: 'gold', label: 'Ouro', target: 200 },
      { tier: 'diamond', label: 'Diamante', target: 2000 },
    ],
  },
  {
    key: 'encourager',
    title: 'Encorajador',
    spiritualName: 'Fortaleça quem está cansado',
    description: 'Envie palavras de apoio e encorajamento para outras pessoas.',
    icon: 'encourager',
    tone: 'rose',
    tiers: [
      { tier: 'bronze', label: 'Bronze', target: 25 },
      { tier: 'silver', label: 'Prata', target: 100 },
      { tier: 'gold', label: 'Ouro', target: 500 },
      { tier: 'diamond', label: 'Diamante', target: 1000 },
    ],
  },
  {
    key: 'evangelist',
    title: 'Evangelizador',
    spiritualName: 'Compartilhe luz com outras pessoas',
    description: 'Compartilhe conteúdos e ajude outras pessoas a conhecerem a Palavra.',
    icon: 'evangelist',
    tone: 'emerald',
    tiers: [
      { tier: 'bronze', label: 'Bronze', target: 5 },
      { tier: 'silver', label: 'Prata', target: 25 },
      { tier: 'gold', label: 'Ouro', target: 100 },
      { tier: 'diamond', label: 'Diamante', target: 500 },
    ],
  },
  {
    key: 'student',
    title: 'Estudioso',
    spiritualName: 'Cresça no conhecimento da Palavra',
    description: 'Avance na leitura bíblica, séries, estudos e futuras escolas.',
    icon: 'student',
    tone: 'amber',
    tiers: [
      { tier: 'bronze', label: 'Bronze', target: 21 },
      { tier: 'silver', label: 'Prata', target: 100 },
      { tier: 'gold', label: 'Ouro', target: 365 },
      { tier: 'diamond', label: 'Diamante', target: 1000 },
    ],
  },
  {
    key: 'witness',
    title: 'Testemunha',
    spiritualName: 'Reconheça as respostas de Deus',
    description: 'Registre respostas de oração e testemunhos da caminhada.',
    icon: 'witness',
    tone: 'fire',
    tiers: [
      { tier: 'bronze', label: 'Bronze', target: 1 },
      { tier: 'silver', label: 'Prata', target: 5 },
      { tier: 'gold', label: 'Ouro', target: 20 },
      { tier: 'diamond', label: 'Diamante', target: 100 },
    ],
  },
  {
    key: 'sower',
    title: 'Semeador',
    spiritualName: 'Sustente a obra com generosidade',
    description: 'Acompanhe contribuições de forma privada, pastoral e segura.',
    icon: 'sower',
    tone: 'violet',
    tiers: [
      { tier: 'bronze', label: 'Bronze', target: 1 },
      { tier: 'silver', label: 'Prata', target: 5 },
      { tier: 'gold', label: 'Ouro', target: 12 },
      { tier: 'diamond', label: 'Diamante', target: 36 },
    ],
  },
  {
    key: 'perseverance',
    title: 'Perseverante',
    spiritualName: 'Permaneça firme na jornada',
    description: 'Mantenha constância em leitura, oração e crescimento com Deus.',
    icon: 'perseverance',
    tone: 'amber',
    tiers: [
      { tier: 'bronze', label: 'Bronze', target: 7 },
      { tier: 'silver', label: 'Prata', target: 30 },
      { tier: 'gold', label: 'Ouro', target: 100 },
      { tier: 'diamond', label: 'Diamante', target: 365 },
    ],
  },
]
