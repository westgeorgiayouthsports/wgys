import { getMaxGradeFromBirthDate, gradeFromAge, graduationYearFromAge, getMaxGradeFromBirthDateCurrentSchoolYear } from '../../utils/season';

describe('season grade helpers', () => {
  test('gradeFromAge returns age-6', () => {
    expect(gradeFromAge(11)).toBe(5);
    expect(gradeFromAge(6)).toBe(0);
    expect(gradeFromAge(3)).toBeNull();
  });

  test('graduationYearFromAge computes controlYear + 18 - age', () => {
    const controlYear = new Date().getUTCFullYear() - 1;
    const control = new Date(Date.UTC(controlYear, 4, 1)); // May 1 of last year
    expect(graduationYearFromAge(11, control)).toBe(controlYear + 18 - 11);
  });

  test('getMaxGradeFromBirthDate mirrors existing logic', () => {
    const controlYear = new Date().getUTCFullYear() - 1;
    const control = new Date(Date.UTC(controlYear, 4, 1)); // May 1 of last year
    const age = 11;
    const birthYear = control.getUTCFullYear() - age;
    const birth = `${birthYear}-06-01`;
    const maxGrade = getMaxGradeFromBirthDate(birth, control);
    expect(maxGrade).toBe(age - 6);
  });

  test('getMaxGradeFromBirthDateCurrentSchoolYear uses current school year', () => {
    const now = require('dayjs')();
    const currentYear = now.year();
    const isBeforeAugust = now.month() < 7;
    const schoolYear = isBeforeAugust ? currentYear - 1 : currentYear;
    const age = 11;
    const birthYear = schoolYear - age;
    const birth = require('dayjs')().year(birthYear).month(5).date(1).format('YYYY-MM-DD');
    const maxGrade = getMaxGradeFromBirthDateCurrentSchoolYear(birth);
    expect(maxGrade).toBe(age - 6);
  });

  test('getMaxGradeFromBirthDateCurrentSchoolYear in August returns grade 5 for age 11', () => {
    jest.useFakeTimers();
    const nowYear = new Date().getUTCFullYear();
    const aug = new Date(Date.UTC(nowYear, 7, 15)); // Aug 15
    jest.setSystemTime(aug);
    const age = 11;
    const schoolYear = nowYear; // Aug -> schoolYear == currentYear
    const birthYear = schoolYear - age;
    const birth = require('dayjs')().year(birthYear).month(5).date(1).format('YYYY-MM-DD');
    const maxGrade = getMaxGradeFromBirthDateCurrentSchoolYear(birth);
    expect(maxGrade).toBe(age - 6);
    jest.useRealTimers();
  });

  test('getMaxGradeFromBirthDateCurrentSchoolYear in March (following year) returns grade 5 for age 11', () => {
    jest.useFakeTimers();
    const nowYear = new Date().getUTCFullYear();
    const march = new Date(Date.UTC(nowYear + 1, 2, 15)); // Mar 15 of following year
    jest.setSystemTime(march);
    const age = 11;
    const schoolYear = (new Date(Date.UTC(nowYear + 1, 2, 15)).getUTCMonth() < 7) ? (nowYear + 1) - 1 : (nowYear + 1);
    // For March, schoolYear should be nowYear (following year - before August)
    const birthYear = schoolYear - age;
    const birth = require('dayjs')().year(birthYear).month(5).date(1).format('YYYY-MM-DD');
    const maxGrade = getMaxGradeFromBirthDateCurrentSchoolYear(birth);
    expect(maxGrade).toBe(age - 6);
    jest.useRealTimers();
  });
});
