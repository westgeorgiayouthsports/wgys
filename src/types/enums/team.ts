export const TeamRoleValues = {
  player: 'player',
  coach: 'coach',
  assistant: 'assistant',
  manager: 'manager',
} as const;

export type TeamRole = typeof TeamRoleValues[keyof typeof TeamRoleValues];

export const TeamRoleList = Object.values(TeamRoleValues) as TeamRole[];
