export const SeasonTypeValues = {
  spring: 'spring',
  summer: 'summer',
  fall: 'fall',
  winter: 'winter',
} as const;
export type SeasonType = typeof SeasonTypeValues[keyof typeof SeasonTypeValues];

export const SeasonStatusValues = {
  draft: 'draft',
  active: 'active',
  closed: 'closed',
  archived: 'archived',
} as const;
export type SeasonStatus = typeof SeasonStatusValues[keyof typeof SeasonStatusValues];

export default {};
