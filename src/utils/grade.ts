import dayjs from 'dayjs';

// Calculate current grade from graduation year.
// If `cutoffDate` is provided, use that to determine the schoolYear; otherwise use today.
export function calculateCurrentGrade(graduationYear?: number, cutoffDate?: dayjs.Dayjs): number | null {
  if (!graduationYear) return null;
  const currentDate = cutoffDate || dayjs();
  const currentYear = currentDate.year();
  const isAfterAugust = currentDate.month() >= 7; // Aug-Dec => new school year
  const schoolYear = isAfterAugust ? currentYear : currentYear - 1;
  const grade = 12 - (graduationYear - schoolYear - 1);
  return grade >= 0 && grade <= 12 ? grade : null;
}

export default calculateCurrentGrade;
