import { parseDateStringToDayjs, localDayjsFromUTCDate } from '../dateHelpers';

describe('dateHelpers', () => {
  test('parseDateStringToDayjs accepts YYYY-MM-DD and returns local dayjs with same Y/M/D', () => {
    const d = parseDateStringToDayjs('2025-05-01');
    expect(d).not.toBeNull();
    expect(d!.year()).toBe(2025);
    expect(d!.month()).toBe(4);
    expect(d!.date()).toBe(1);
  });

  test('parseDateStringToDayjs accepts common separators', () => {
    const a = parseDateStringToDayjs('05/01/2025');
    const b = parseDateStringToDayjs('05.01.2025');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.year()).toBe(2025);
    expect(b!.year()).toBe(2025);
  });

  test('localDayjsFromUTCDate uses UTC components and does not shift by timezone', () => {
    const utc = new Date(Date.UTC(2025, 4, 1)); // May 1, 2025 UTC
    const local = localDayjsFromUTCDate(utc);
    expect(local!.year()).toBe(2025);
    expect(local!.month()).toBe(4);
    expect(local!.date()).toBe(1);
  });
});
