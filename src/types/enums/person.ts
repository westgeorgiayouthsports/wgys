export const PersonRoleValues = {
  parent: 'parent',
  guardian: 'guardian',
  athlete: 'athlete',
  grandparent: 'grandparent',
  relative: 'relative',
  other: 'other',
} as const;
export type PersonRole = typeof PersonRoleValues[keyof typeof PersonRoleValues];

// export const RelationshipTypeValues = {
//   parent: 'parent',
//   child: 'child',
//   sibling: 'sibling',
//   guardian: 'guardian',
//   spouse: 'spouse',
//   grandparent: 'grandparent',
//   other: 'other',
// } as const;
// export type RelationshipType = typeof RelationshipTypeValues[keyof typeof RelationshipTypeValues];

export const ContactMethodValues = {
  email: 'email',
  sms: 'sms',
  phone: 'phone',
  app: 'app',
} as const;
export type ContactMethod = typeof ContactMethodValues[keyof typeof ContactMethodValues];

export const PersonSourceValues = {
  signup: 'signup',
  manual: 'manual',
  import: 'import',
} as const;
export type PersonSource = typeof PersonSourceValues[keyof typeof PersonSourceValues];

export const SexValues = {
  male: 'male',
  female: 'female',
} as const;

export type Sex = typeof SexValues[keyof typeof SexValues];

export const SexList = Object.values(SexValues) as Sex[];