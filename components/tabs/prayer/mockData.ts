import type {
  PrayerEncouragementOption,
  PrayerGuide,
  PrayerLearningItem,
} from './types'

export const TODAY_PRAYER_GUIDE: PrayerGuide = {
  title: 'Ore por direção',
  subtitle: 'Aprenda a entregar suas decisões ao Senhor antes de agir.',
  bibleReference: 'Tiago 1:5',
  bibleText:
    'E, se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente.',
  estimatedMinutes: 5,
  steps: [
    {
      title: 'Agradeça',
      description:
        'Comece reconhecendo que Deus tem cuidado de você até aqui.',
    },
    {
      title: 'Entregue suas decisões',
      description:
        'Fale com Deus sobre as escolhas, portas e caminhos que estão diante de você.',
    },
    {
      title: 'Peça sabedoria',
      description:
        'Ore para que o Espírito Santo alinhe seus pensamentos com a vontade de Deus.',
    },
    {
      title: 'Interceda por alguém',
      description:
        'Ore por uma pessoa que também precisa de direção neste tempo.',
    },
  ],
}

export const PRAYER_LEARNING_ITEMS: PrayerLearningItem[] = [
  {
    id: 'o-que-e-oracao',
    title: 'O que é oração?',
    subtitle: 'Entenda oração como relacionamento, dependência e entrega.',
    icon: '🙏',
    minutes: 4,
  },
  {
    id: 'orar-com-a-palavra',
    title: 'Como orar com a Palavra',
    subtitle: 'Aprenda a transformar textos bíblicos em oração.',
    icon: '📖',
    minutes: 6,
  },
  {
    id: 'intercessao',
    title: 'Como interceder por alguém',
    subtitle: 'Ore com compaixão, fé e responsabilidade espiritual.',
    icon: '🤲',
    minutes: 5,
  },
  {
    id: 'perseveranca',
    title: 'Perseverança na oração',
    subtitle: 'Como continuar orando mesmo quando a resposta demora.',
    icon: '🔥',
    minutes: 7,
  },
]

export const PRAYER_ENCOURAGEMENT_OPTIONS: PrayerEncouragementOption[] = [
  {
    emoji: '🙏',
    message: 'Orando por você',
  },
  {
    emoji: '💙',
    message: 'Deus te fortaleça',
  },
  {
    emoji: '📖',
    message: 'O Senhor é contigo',
  },
  {
    emoji: '🔥',
    message: 'Permaneça firme',
  },
  {
    emoji: '✨',
    message: 'Que Deus responda',
  },
]
