
// Sports are stored in the database and are dynamic. Provide helpers
// to build UI options from the sports table instead of maintaining a static enum.
export type SportType = string;

export function sportOptionsFromList(sports: Array<{ id: string; name: string }>) {
  return (sports || []).map(s => ({ value: s.id, label: s.name }));
}

export function getSportLabel(sports: Array<{ id: string; name: string }> | undefined, id?: string) {
  if (!id) return '-';
  const found = (sports || []).find(s => s.id === id);
  return found ? found.name : id;
}

export const ProgramRegistrationStatusItems = [
  { value: 'cart', label: 'Cart' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'waitlist', label: 'Waitlist' },
] as const;

export type ProgramRegistrationStatus = typeof ProgramRegistrationStatusItems[number]['value'];
export const ProgramRegistrationStatusList = ProgramRegistrationStatusItems.map(i => i.value) as ProgramRegistrationStatus[];
export const ProgramRegistrationStatusValues = Object.fromEntries(ProgramRegistrationStatusItems.map(i => [i.value, i.value])) as { [K in ProgramRegistrationStatus]: K };

export const PaymentPlanItems = [
  { value: 'full', label: 'Full' },
  { value: 'plan', label: 'Plan' },
] as const;

export type PaymentPlan = typeof PaymentPlanItems[number]['value'];
export const PaymentPlanList = PaymentPlanItems.map(i => i.value) as PaymentPlan[];
export const PaymentPlanValues = Object.fromEntries(PaymentPlanItems.map(i => [i.value, i.value])) as { [K in PaymentPlan]: K };

export const PaymentPlanFrequencyItems = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export type PaymentPlanFrequency = typeof PaymentPlanFrequencyItems[number]['value'];
export const PaymentPlanFrequencyList = PaymentPlanFrequencyItems.map(i => i.value) as PaymentPlanFrequency[];
export const PaymentPlanFrequencyValues = Object.fromEntries(PaymentPlanFrequencyItems.map(i => [i.value, i.value])) as { [K in PaymentPlanFrequency]: K };

export const QuestionTypeItems = [
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'file_upload', label: 'File Upload' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'jersey_number', label: 'Jersey Number' },
  { value: 'waiver', label: 'Waiver' },
] as const;

export type QuestionType = typeof QuestionTypeItems[number]['value'];
export const QuestionTypeList = QuestionTypeItems.map(i => i.value) as QuestionType[];
export const QuestionTypeValues = Object.fromEntries(QuestionTypeItems.map(i => [i.value, i.value])) as { [K in QuestionType]: K };

export const ProgramTypeItems = [
  { value: 'sport', label: 'Sport' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'training', label: 'Training' },
  { value: 'tryout', label: 'Tryout' },
  { value: 'camp', label: 'Camp' },
  { value: 'recreation', label: 'Recreation' },
  { value: 'select', label: 'Select' },
] as const;

export type ProgramType = typeof ProgramTypeItems[number]['value'];
export const ProgramTypeList = ProgramTypeItems.map(i => i.value) as ProgramType[];
export const ProgramTypeValues = Object.fromEntries(ProgramTypeItems.map(i => [i.value, i.value])) as { [K in ProgramType]: K };
export const ProgramTypeLabels = Object.fromEntries(ProgramTypeItems.map(i => [i.value, i.label])) as Record<ProgramType, string>;
export function getProgramTypeLabel(t?: ProgramType) {
  if (!t) return '-';
  return ProgramTypeLabels[t] ?? (t.charAt(0).toUpperCase() + t.slice(1));
}

export const ProgramSexItems = [
  { value: 'any', label: 'Any' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

export type ProgramSex = typeof ProgramSexItems[number]['value'];
export const ProgramSexList = ProgramSexItems.map(i => i.value) as ProgramSex[];
export const ProgramSexValues = Object.fromEntries(ProgramSexItems.map(i => [i.value, i.value])) as { [K in ProgramSex]: K };

export const ProgramDivisionItems = [
  { value: '4U', label: '4U' },
  { value: '5U', label: '5U' },
  { value: '6U', label: '6U' },
  { value: '7U', label: '7U' },
  { value: '8U', label: '8U' },
  { value: '9U', label: '9U' },
  { value: '10U', label: '10U' },
  { value: '11U', label: '11U' },
  { value: '12U', label: '12U' },
  { value: '13U', label: '13U' },
  { value: '14U', label: '14U' },
  { value: '15U', label: '15U' },
  { value: '16U', label: '16U' },
  { value: '17U', label: '17U' },
  { value: '18U', label: '18U' },
] as const;

export type ProgramDivision = typeof ProgramDivisionItems[number]['value'];
export const ProgramDivisionList = ProgramDivisionItems.map(i => i.value) as ProgramDivision[];