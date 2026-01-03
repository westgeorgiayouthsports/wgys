import { jest } from '@jest/globals';
import { firebaseDiscounts } from '../../services/firebaseDiscounts';

describe('firebaseDiscounts service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getActiveDiscountsForSeason merges global discounts with season overrides and filters active/current', async () => {
    // mock season configs
    jest.spyOn(firebaseDiscounts as any, 'getSeasonDiscountConfigs').mockResolvedValue({
      sibling: { discountId: 'sibling', active: true, startDate: '2020-01-01', expirationDate: '2030-01-01' },
      early: { discountId: 'earlybird', active: false },
    });

    // mock getDiscountById to return global defs
    jest.spyOn(firebaseDiscounts as any, 'getDiscountById').mockImplementation(async (id: any) => {
      if (id === 'sibling') return { id: 'sibling', code: 'SIBLING', amountType: 'fixed', amount: 10, appliesTo: 'cart', active: true } as any;
      if (id === 'earlybird') return { id: 'earlybird', code: 'EARLY', amountType: 'fixed', amount: 20, appliesTo: 'cart', active: true } as any;
      return null;
    });

    const res = await firebaseDiscounts.getActiveDiscountsForSeason('season-1');
    expect(res).toBeInstanceOf(Array);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('sibling');
    expect((res[0] as any).seasonId).toBe('season-1');
  });

  test('findByCode prefers season overlay when resolving code for a season', async () => {
    const merged = [{ id: 'sibling', code: 'SIBLING', amountType: 'fixed', amount: 10, appliesTo: 'cart', active: true }];
    jest.spyOn(firebaseDiscounts as any, 'getActiveDiscountsForSeason').mockResolvedValue(merged as any);

    // also ensure getDiscounts candidates exist if fallback used
    jest.spyOn(firebaseDiscounts as any, 'getDiscounts').mockResolvedValue([] as any);

    const found = await firebaseDiscounts.findByCode('SIBLING', 'season-1');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('sibling');
  });
});
