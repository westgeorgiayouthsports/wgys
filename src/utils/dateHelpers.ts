import dayjs from 'dayjs';

// Parse a manually-typed date string into a dayjs object using common separators
export function parseDateStringToDayjs(s?: string | null) {
  if (!s) return null;
  const str = (s || '').trim();
  if (!str) return null;
  let p = dayjs(str);
  if (p.isValid()) return p;
  p = dayjs(str.replace(/-/g, '/'));
  if (p.isValid()) return p;
  p = dayjs(str.replace(/\./g, '/'));
  if (p.isValid()) return p;

  // Fallback: attempt parsing as YYYY-MM-DD by constructing local date components
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    return dayjs().year(y).month(mo - 1).date(d).hour(0).minute(0).second(0).millisecond(0);
  }

  return null;
}

// Create a local-dayjs object from a UTC Date using the UTC Y/M/D parts
export function localDayjsFromUTCDate(d: Date | string | undefined | null) {
  if (!d) return dayjs();
  const dt = new Date(d as any);
  return dayjs().year(dt.getUTCFullYear()).month(dt.getUTCMonth()).date(dt.getUTCDate()).hour(0).minute(0).second(0).millisecond(0);
}

export default { parseDateStringToDayjs, localDayjsFromUTCDate };
