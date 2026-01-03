import logger from "./logger";
import dayjs from 'dayjs';

export type Term = 'spring' | 'fall';

export interface SimpleSeason {
  term: Term;
  year: number;
}

export const DEFAULT_SPORT_AGE_CONTROL: Record<string, { month: number; day: number }> = {
  baseball: { month: 4, day: 1 }, // May 1 (0-based month)
  softball: { month: 0, day: 1 }, // Jan 1
  softball_travel: { month: 8, day: 1 }, // Sep 1
  basketball: { month: 8, day: 1 },
  football: { month: 8, day: 1 },
  default: { month: 0, day: 1 },
};

function parseMMDD(mmdd: string | undefined): { month: number; day: number } | null {
  if (!mmdd) return null;
  const parts = mmdd.split('-').map(p => p.trim());
  if (parts.length !== 2) return null;
  const m = Number(parts[0]);
  const d = Number(parts[1]);
  if (!Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { month: m, day: d };
}

export function getAgeControlDateFromSportAndSeason(
  season: { year?: number; seasonType?: string; startDate?: string } | SimpleSeason,
  sportAgeControlMMDD?: string,
  sportName?: string
): Date {
  // resolve term and year
  let term: Term = 'spring';
  let year = (season as any).year ?? new Date().getFullYear();

  const seasonType = (season as any).seasonType;
  if (seasonType === 'fall') term = 'fall';
  else if (seasonType === 'spring') term = 'spring';
  else if ((season as any).startDate) {
    try {
      const d = new Date((season as any).startDate);
      const m = d.getUTCMonth() + 1;
      if (m >= 9 && m <= 11) term = 'fall';
      else if (m >= 3 && m <= 5) term = 'spring';
      else term = 'spring';
      year = d.getUTCFullYear();
    } catch (e) {
      logger.error('Error parsing season startDate for age control date', e);
    }
  }

  const controlYear = term === 'fall' ? year + 1 : year;

  // determine month/day
  let md = parseMMDD(sportAgeControlMMDD ?? undefined);
  if (!md && sportName) {
    const name = sportName.toLowerCase();
    if (name.includes('baseball')) md = { month: 5, day: 1 };
    if (name.includes('softball')) md = { month: 1, day: 1 };
  }

  // If we still don't have month/day, default to Jan 1 of the CURRENT year
  if (!md) {
    const fallbackYear = new Date().getFullYear();
    // JS Date months are zero-based, so month=1 -> February; to represent Jan 1 use month=1 in parse but subtract 1 below
    md = { month: 1, day: 1 };
    return new Date(Date.UTC(fallbackYear, md.month - 1, md.day));
  }

  // JS Date months are zero-based, use UTC to avoid timezone artifacts
  return new Date(Date.UTC(controlYear, md.month - 1, md.day));
}

export function getAgeControlDateForSeason(season: SimpleSeason, sport?: { ageControlDate?: string; name?: string } | string): Date {
  if (typeof sport === 'string') return getAgeControlDateFromSportAndSeason(season, undefined, sport);
  return getAgeControlDateFromSportAndSeason(season, sport?.ageControlDate, sport?.name);
}

export function calculateAgeOnDate(birth: string | Date, controlDate: Date): number {
  const bd = typeof birth === 'string' ? new Date(birth) : birth;
  let age = controlDate.getUTCFullYear() - bd.getUTCFullYear();
  const cm = controlDate.getUTCMonth();
  const cd = controlDate.getUTCDate();
  const bm = bd.getUTCMonth();
  const bdDate = bd.getUTCDate();
  if (cm < bm || (cm === bm && cd < bdDate)) age--;
  return age;
}

// Return school grade for a given age (season age). Uses simple mapping: grade = age - 6
// Returns null for invalid ages (less than 0 or greater than 18)
export function gradeFromAge(age: number): number | null {
  if (typeof age !== 'number' || Number.isNaN(age)) return null;
  const grade = age - 6;
  return grade >= 0 && grade <= 12 ? grade : null;
}

// Given an age and a control date, compute the expected graduation year.
// Formula used elsewhere in the app: graduationYear = controlYear + 18 - age
export function graduationYearFromAge(age: number, controlDate: Date): number {
  const controlYear = controlDate.getUTCFullYear();
  return controlYear + 18 - age;
}

// Compute the maximum grade (used for auto-setting program maxGrade) from a birth date
// and a season control date. This mirrors existing inline logic used in the app:
// maxGrade = controlYear - birthYear - 6
export function getMaxGradeFromBirthDate(birth: string | Date, controlDate: Date): number | null {
  const bd = typeof birth === 'string' ? new Date(birth) : birth;
  if (!(bd instanceof Date) || Number.isNaN(bd.getTime())) return null;
  const maxGrade = controlDate.getUTCFullYear() - bd.getUTCFullYear() - 6;
  return Number.isFinite(maxGrade) ? maxGrade : null;
}

// Compute max grade using the current school year (used as a simple fallback):
// schoolYear = currentYear unless before August then previous year
export function getMaxGradeFromBirthDateCurrentSchoolYear(birth: string | Date): number {
  const bd = typeof birth === 'string' ? new Date(birth) : birth;
  if (!(bd instanceof Date) || Number.isNaN(bd.getTime())) return -1;
  const now = new Date();
  const currentYear = now.getFullYear();
  const isBeforeAugust = now.getMonth() < 7; // Jan-Jul => previous school year
  const schoolYear = isBeforeAugust ? currentYear - 1 : currentYear;
  const calculatedMaxGrade = schoolYear - bd.getUTCFullYear() - 6;
  return Number.isFinite(calculatedMaxGrade) ? calculatedMaxGrade : -1;
}

export function normalizeSeason(raw: any): SimpleSeason {
  // Prefer explicit fields
  if (raw == null) return { term: 'spring', year: new Date().getFullYear() };
  if (typeof raw.year === 'number' && raw.seasonType) {
    const term: Term = raw.seasonType === 'fall' ? 'fall' : 'spring';
    return { term, year: raw.year };
  }

  // If startDate present, derive season meta like seasonsService.deriveSeasonMeta
  if (raw.startDate) {
    try {
      const d = new Date(raw.startDate);
      const m = d.getUTCMonth() + 1;
      const type = m >= 3 && m <= 5 ? 'spring' : (m >= 9 && m <= 11 ? 'fall' : 'spring');
      return { term: type === 'fall' ? 'fall' : 'spring', year: d.getUTCFullYear() };
    } catch (e) {
      logger.error('Error parsing startDate for season normalization', e);
    }
  }

  // last-resort defaults
  return { term: 'spring', year: new Date().getFullYear() };
}

// Division catalog
export type SexRestriction = 'male' | 'female' | 'any';

export interface Division {
  label: string;
  minAge: number; // inclusive minimum season age
  maxAge: number; // inclusive maximum season age
  sex?: SexRestriction;
}

// Build standard XU divisions from 4U..18U and include any custom overrides
const standardDivisions: Record<string, Division> = {};
for (let u = 4; u <= 18; u++) {
  const key = `${u}u`;
  standardDivisions[key] = { label: `${u}U`, minAge: u - 1, maxAge: u, sex: 'any' };
}

export const DIVISIONS: Record<string, Division> = {
  // include standard divisions
  ...standardDivisions,
  // legacy/custom examples (if you want sport-specific naming)
  '4u-baseball': { label: '4U Baseball', minAge: 3, maxAge: 4, sex: 'any' },
};

export function getDivision(id: string): Division | undefined {
  if (!id) return undefined;
  return DIVISIONS[id];
}

// Given a control date (season anchor) and a division id, return the birth date range
// for eligibility for that division. Uses UTC math to avoid timezone shifts.
export function getDivisionBirthDateRange(controlDate: Date, divisionId: string) {
  const div = getDivision(divisionId);
  if (!div) return null;
  const { minAge, maxAge } = div;
  const cy = controlDate.getUTCFullYear();
  const cm = controlDate.getUTCMonth();
  const cd = controlDate.getUTCDate();

  // fromDate: controlDate - (maxAge + 1) years
  const from = new Date(Date.UTC(cy - (maxAge + 1), cm, cd));
  // toDate: controlDate - minAge years - 1 day
  const toCandidate = new Date(Date.UTC(cy - minAge, cm, cd));
  const to = new Date(Date.UTC(toCandidate.getUTCFullYear(), toCandidate.getUTCMonth(), toCandidate.getUTCDate() - 1));

  return {
    fromDate: from,
    toDate: to,
    fromDateDisplay: dayjs(from).format('MMM D, YYYY'),
    toDateDisplay: dayjs(to).format('MMM D, YYYY'),
  };
}

// Helper to list divisions enabled for a season. If seasonSpec.divisions is provided
// it should be an array of division ids; otherwise return full catalog as array.
export function getDivisionsForSeason(seasonSpec?: { divisions?: string[] }) {
  if (!seasonSpec || !Array.isArray(seasonSpec.divisions) || seasonSpec.divisions.length === 0) {
    return Object.entries(DIVISIONS).map(([id, d]) => ({ id, ...d }));
  }
  return seasonSpec.divisions.map(id => ({ id, ...(DIVISIONS[id] || { label: id, minAge: 0, maxAge: 100, sex: 'any' }) }));
}
