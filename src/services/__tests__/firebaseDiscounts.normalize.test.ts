import { firebaseDiscounts } from '../firebaseDiscounts';

test('normalizePayload coerces amount to number and active to boolean', () => {
  const raw = {
    code: 'BLACKFRIDAY',
    amountType: 'fixed',
    amount: '25',
    appliesTo: 'line_item',
    description: 'Black Friday promotional discount',
    active: true,
    allowedProgramTemplateIds: ['baseball-recreation','softball-recreation'],
    perAdditional: false,
    perAdditionalAmounts: [],
  } as any;

  const normalized = firebaseDiscounts.normalizePayload(raw) as any;
  expect(typeof normalized.amount).toBe('number');
  expect(normalized.amount).toBe(25);
  expect(typeof normalized.active).toBe('boolean');
  expect(normalized.active).toBe(true);
  expect(normalized.perAdditional).toBe(false);
  expect(Array.isArray(normalized.perAdditionalAmounts)).toBe(true);
});
