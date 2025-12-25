export const SportValues = {
  baseball: 'baseball',
  softball: 'softball',
  basketball: 'basketball',
  soccer: 'soccer',
  tennis: 'tennis',
  other: 'other',
} as const;
export type SportType = typeof SportValues[keyof typeof SportValues];

export const ProgramRegistrationStatusValues = {
  cart: 'cart',
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
  waitlist: 'waitlist',
} as const;
export type ProgramRegistrationStatus = typeof ProgramRegistrationStatusValues[keyof typeof ProgramRegistrationStatusValues];

export const PaymentPlanValues = {
  full: 'full',
  plan: 'plan',
} as const;
export type PaymentPlan = typeof PaymentPlanValues[keyof typeof PaymentPlanValues];

export const PaymentPlanFrequencyValues = {
  weekly: 'weekly',
  biweekly: 'biweekly',
  monthly: 'monthly',
} as const;
export type PaymentPlanFrequency = typeof PaymentPlanFrequencyValues[keyof typeof PaymentPlanFrequencyValues];

export const QuestionTypeValues = {
  short_answer: 'short_answer',
  paragraph: 'paragraph',
  dropdown: 'dropdown',
  checkboxes: 'checkboxes',
  file_upload: 'file_upload',
  waiver: 'waiver',
} as const;

export type QuestionType = typeof QuestionTypeValues[keyof typeof QuestionTypeValues];

export const QuestionTypeList = Object.values(QuestionTypeValues) as QuestionType[];