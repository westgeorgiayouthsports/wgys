export const SeasonValues = {
  spring: 'spring',
  summer: 'summer',
  fall: 'fall',
  winter: 'winter',
} as const;
export type SeasonType = typeof SeasonValues[keyof typeof SeasonValues];
