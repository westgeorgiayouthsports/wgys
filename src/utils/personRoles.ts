import { PersonRoleValues, PersonRole } from '../types/enums/person';

export const coreRoles: PersonRole[] = ['parent', 'guardian', 'athlete', 'grandparent'];
export const peripheralRoles: PersonRole[] = ['relative', 'other'];

const allowedRoles = new Set<string>(Object.values(PersonRoleValues));

export function validateRoles(_: any, value?: PersonRole[] | string[]) {
  const v = (value || []) as string[];
  if (!v || v.length === 0) return Promise.resolve();

  // Ensure every selected role exists in PersonRole enum
  const invalid = v.find(r => !allowedRoles.has(r));
  if (invalid) return Promise.reject(new Error(`Invalid role: ${invalid}`));

  // Athlete cannot be combined with other roles
  if (v.includes('athlete') && v.length > 1) {
    return Promise.reject(new Error('Athlete/Child cannot have other relationships'));
  }

  // Relative/other cannot be combined with core roles
  const hasCoreRole = v.some(r => coreRoles.includes(r as PersonRole));
  const hasPeripheralRole = v.some(r => peripheralRoles.includes(r as PersonRole));
  if (hasCoreRole && hasPeripheralRole) {
    return Promise.reject(new Error('Relative/Other cannot be combined with family roles'));
  }

  return Promise.resolve();
}

export default validateRoles;
