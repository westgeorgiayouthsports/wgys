export const EventTypeValues = {
  practice: 'practice',
  game: 'game',
  tournament: 'tournament',
} as const;
export type EventType = typeof EventTypeValues[keyof typeof EventTypeValues];
