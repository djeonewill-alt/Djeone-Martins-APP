export type GamificationEventType =
  | 'read_chapter'
  | 'pray_for_request'
  | 'create_prayer_request'
  | 'send_encouragement'
  | 'share_content'
  | 'complete_episode'
  | 'complete_series'
  | 'mark_prayer_answered'

export const GAMIFICATION_EVENT_POINTS: Record<GamificationEventType, number> = {
  read_chapter: 10,
  pray_for_request: 5,
  create_prayer_request: 5,
  send_encouragement: 3,
  share_content: 25,
  complete_episode: 10,
  complete_series: 100,
  mark_prayer_answered: 20,
}
