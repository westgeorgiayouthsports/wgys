export const UserRoleValues = {
  user: 'user',
  admin: 'admin',
  coach: 'coach',
  owner: 'owner',
} as const;

export type UserRole = typeof UserRoleValues[keyof typeof UserRoleValues];

// runtime helper for lists
export const UserRoleList = Object.values(UserRoleValues) as UserRole[];
