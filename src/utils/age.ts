import dayjs from 'dayjs';

// Calculate age (in years) at a given cutoff date. If no cutoffDate provided, uses today.
export function calculateAgeAt(dateOfBirth?: string, cutoffDate?: dayjs.Dayjs): number | null {
  if (!dateOfBirth) return null;
  const cd = cutoffDate || dayjs();
  return cd.diff(dayjs(dateOfBirth), 'year');
}

export default calculateAgeAt;
