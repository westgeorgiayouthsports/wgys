import { jest } from '@jest/globals';
import { firebaseDiscounts } from '../../services/firebaseDiscounts';
import { auditLogService } from '../../services/auditLog';
import { set, get } from 'firebase/database';
import { AuditEntity } from '../../types/enums';

jest.mock('firebase/database', () => ({
  ref: jest.fn(() => ({})),
  set: (jest.fn() as any).mockResolvedValue(null),
  get: (jest.fn() as any).mockResolvedValue({ exists: () => false, val: () => null }),
}));

describe('season overlay audit logging', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('setSeasonDiscountConfig writes and logs an audit entry', async () => {
    const spy = jest.spyOn(auditLogService, 'log').mockResolvedValue('audit-key' as any);

    await firebaseDiscounts.setSeasonDiscountConfig('season-1', 'sibling', { discountId: 'sibling', active: true });

    expect((set as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls[0][0];
    expect(args.action).toBe('season.discount.set');
    expect(args.entityType).toBe(AuditEntity.Season);
    expect(args.entityId).toBe('season-1');
    expect(args.details).toBeDefined();
  });

  test('removeSeasonDiscountConfig removes entry and logs audit with before snapshot', async () => {
    // make get return a snapshot with data
    (get as any).mockResolvedValueOnce({ exists: () => true, val: () => ({ discountId: 'sibling', active: true }) } as any);
    const spy = jest.spyOn(auditLogService, 'log').mockResolvedValue('audit-key' as any);

    await firebaseDiscounts.removeSeasonDiscountConfig('season-1', 'sibling');

    expect((set as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect((get as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls[0][0];
    expect(args.action).toBe('season.discount.removed');
    expect(args.entityType).toBe(AuditEntity.Season);
    expect(args.entityId).toBe('season-1');
    expect(args.details.before).toBeDefined();
  });
});
