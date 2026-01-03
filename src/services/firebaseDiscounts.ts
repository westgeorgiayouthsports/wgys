import { ref, get, set } from 'firebase/database';
import { db } from './firebase';
import { seasonsService } from './firebaseSeasons';
import logger from '../utils/logger';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';
import { slugify } from '../utils/slugify';

export interface Discount {
  id: string;
  code: string;
  seasonId?: string | null;
  programId?: string | null;
  amountType: 'percent' | 'fixed' | string;
  amount: number;
  appliesTo: 'line_item' | 'cart' | string;
  minRegistrationsPerFamily?: number | null;
  maxUsesPerPlayer?: number | null;
  globalMaxUses?: number | null;
  // If true, apply the discount amount once for each additional registration beyond the first
  perAdditional?: boolean | null;
  // Optional per-additional registration amounts. Index 0 -> amount applied to 2nd registration,
  // index 1 -> 3rd registration, etc. Useful for sibling discounts with different amounts per slot.
  perAdditionalAmounts?: number[] | null;
  allowedProgramTemplateIds?: string[] | null;
  active: boolean;
  description?: string | null;
}

export const firebaseDiscounts = {
  // Normalize payloads coming from UI forms so components stay thin.
  normalizePayload(raw: any): Partial<Discount> {
    if (!raw) return {};
    const p: any = { ...(raw || {}) };
    // allowedProgramTemplateIds: accept CSV string or array
    if (p.allowedProgramTemplateIds && typeof p.allowedProgramTemplateIds === 'string') {
      p.allowedProgramTemplateIds = p.allowedProgramTemplateIds.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    // normalize code to uppercase for canonical representation
    if (p.code !== undefined && p.code !== null) {
      p.code = String(p.code).trim().toUpperCase();
    }
    // Note: global discounts do not carry start/end dates — season overlays control timing.
    // amount numeric
    if (p.amount !== undefined && p.amount !== null) p.amount = Number(p.amount);
    // active: coerce from string/number to boolean reliably
    if (p.active !== undefined && p.active !== null) {
      if (typeof p.active === 'string') {
        const s = p.active.trim().toLowerCase();
        p.active = (s === 'true' || s === '1');
      } else if (typeof p.active === 'number') {
        p.active = p.active !== 0;
      } else {
        p.active = Boolean(p.active);
      }
    }
    // perAdditionalAmounts: accept CSV string or array of numbers/strings
    if (p.perAdditionalAmounts) {
      if (typeof p.perAdditionalAmounts === 'string') {
        p.perAdditionalAmounts = (p.perAdditionalAmounts as string).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
      } else if (Array.isArray(p.perAdditionalAmounts)) {
        p.perAdditionalAmounts = (p.perAdditionalAmounts as any[]).map(n => Number(n));
      }
    }
    if (!p.amountType) p.amountType = 'fixed';
    if (p.active === undefined || p.active === null) p.active = false;
    return p as Partial<Discount>;
  },
  async getDiscounts(): Promise<Discount[]> {
    try {
      const snap = await get(ref(db, 'discounts'));
      if (!snap.exists()) return [];
      const data = snap.val();
      return Object.entries(data).map(([id, d]: [string, any]) => ({ id, ...(d || {}) }));
    } catch (e) {
      logger.error('Error fetching discounts:', e);
      return [];
    }
  },

  async getDiscountById(id: string): Promise<Discount | null> {
    try {
      const snap = await get(ref(db, `discounts/${id}`));
      if (!snap.exists()) return null;
      return { id, ...(snap.val() || {}) } as Discount;
    } catch (e) {
      logger.error('Error fetching discount by id', e);
      return null;
    }
  },

  // Find a discount by code. If seasonId is provided, prefer discounts that are in that season's discountIds or match year/scope.
  async findByCode(code: string, seasonId?: string): Promise<Discount | null> {
    try {
      const all = await this.getDiscounts();
      const norm = (code || '').trim().toLowerCase();
      if (!norm) return null;

      // If seasonId provided, prefer merged/active season-configured discounts (thin overlay on global defs)
      if (seasonId) {
        try {
          const seasonMerged = await this.getActiveDiscountsForSeason(seasonId);
          const match = seasonMerged.find(d => ((d.code || '').toLowerCase() === norm));
          if (match) return match;
        } catch (e) {
          logger.error('Failed to read season merged discounts, falling back', e);
        }
      }

      // candidate discounts matching code and active
      const candidates = all.filter(d => (d.code || '').toLowerCase() === norm && (d.active ?? false));
      if (candidates.length === 0) return null;

      if (!seasonId) {
        // Global discounts no longer have start/end dates; return first active candidate
        return candidates[0] || null;
      }

      // If no merged season overlay matched earlier, fall back to legacy season.discountIds check
      const season = await seasonsService.getSeasonById(seasonId);
      for (const d of candidates) {
        if (season && Array.isArray((season as any).discountIds) && (season as any).discountIds.includes(d.id)) {
          return d;
        }
      }

      return null;
    } catch (e) {
      logger.error('Error finding discount by code', e);
      return null;
    }
  },

  // Group discounts: stored under `groupDiscounts/{seasonId}` or `groupDiscounts` map
  async getGroupDiscounts(): Promise<Record<string, any>> {
    try {
      const snap = await get(ref(db, 'groupDiscounts'));
      if (!snap.exists()) return {};
      return snap.val() || {};
    } catch (e) {
      logger.error('Error fetching groupDiscounts', e);
      return {};
    }
  },

  async getGroupDiscountsForSeason(seasonId: string): Promise<Record<string, number> | null> {
    try {
      const snap = await get(ref(db, `groupDiscounts/${seasonId}`));
      if (!snap.exists()) return null;
      return snap.val() || null;
    } catch (e) {
      logger.error('Error fetching groupDiscounts for season', e);
      return null;
    }
  },
  // Read season-specific discount config entries stored under `seasons/{seasonId}/discounts`.
  // Each entry is expected to be like: { discountId: string, active?: boolean, expirationDate?: string, startDate?: string, amount?: number, amountType?: 'fixed'|'percent' }
  async getSeasonDiscountConfigs(seasonId: string): Promise<Record<string, any> | null> {
    try {
      const snap = await get(ref(db, `seasons/${seasonId}/discounts`));
      if (!snap.exists()) return null;
      return snap.val() || null;
    } catch (e) {
      logger.error('Error fetching season discount configs', e);
      return null;
    }
  },

  // Return merged discount definitions for a season by combining global discount records with the
  // season-level overrides (active flag, startDate/endDate overrides). Filters to only active
  // and currently valid discounts for that season.
  async getActiveDiscountsForSeason(seasonId: string): Promise<Discount[]> {
    try {
      const cfg = await this.getSeasonDiscountConfigs(seasonId);
      if (!cfg) return [];
      const ids = Object.keys(cfg);
      if (ids.length === 0) return [];

      const merged: Discount[] = [];
      const now = new Date();

      for (const key of ids) {
        const entry = cfg[key] || {};
        const discountId = entry.discountId || key;
        const global = await this.getDiscountById(discountId);
        if (!global) continue;

        const copy: any = { ...global } as Discount;
        // apply overrides from season config (timing and optional amount override live on the season overlay)
        if (entry.active !== undefined) copy.active = Boolean(entry.active);
        const seasonStart = entry.startDate ? new Date(entry.startDate) : null;
        const seasonExp = entry.expirationDate ? new Date(entry.expirationDate) : null;
        if (entry.amount !== undefined && entry.amount !== null) copy.amount = Number(entry.amount);
        if (entry.amountType) copy.amountType = entry.amountType;
        // tag with season for caller convenience
        copy.seasonId = seasonId;

        // only include if active and in season date window
        if (!copy.active) continue;
        if (seasonStart && seasonStart > now) continue;
        if (seasonExp && seasonExp < now) continue;

        merged.push(copy as Discount);
      }

      return merged;
    } catch (e) {
      logger.error('Error building active discounts for season', e);
      return [];
    }
  },

  // Utility to clone the season discounts subtree from one season to another (shallow copy)
  async cloneSeasonDiscounts(oldSeasonId: string, newSeasonId: string): Promise<void> {
    try {
      const snap = await get(ref(db, `seasons/${oldSeasonId}/discounts`));
      const data = snap.exists() ? snap.val() : null;
      await set(ref(db, `seasons/${newSeasonId}/discounts`), data || null);
    } catch (e) {
      logger.error('Error cloning season discounts', e);
      throw e;
    }
  },
  // Set or update a single season-level discount config entry under `seasons/{seasonId}/discounts/{key}`
  async setSeasonDiscountConfig(seasonId: string, key: string, cfg: any): Promise<void> {
    try {
      // only allow the thin overlay keys we expect (allow overriding amount and amountType)
      const allowed = ['discountId', 'active', 'expirationDate', 'startDate', 'amount', 'amountType'];
      const cleaned = Object.fromEntries(Object.entries(cfg || {}).filter(([k, v]) => allowed.includes(k) && v !== undefined));
      await set(ref(db, `seasons/${seasonId}/discounts/${key}`), cleaned);
      try {
        await auditLogService.log({ action: 'season.discount.set', entityType: AuditEntity.Season, entityId: seasonId, details: { key, cfg: cleaned } });
      } catch (e) {
        logger.error('Error auditing season.discount.set', e);
      }
    } catch (e) {
      logger.error('Error setting season discount config', e);
      throw e;
    }
  },

  // Remove a season-level discount config entry
  async removeSeasonDiscountConfig(seasonId: string, key: string): Promise<void> {
    try {
      const r = ref(db, `seasons/${seasonId}/discounts/${key}`);
      const snap = await get(r);
      const before = snap.exists() ? snap.val() : null;
      await set(r, null as any);
      try {
        await auditLogService.log({ action: 'season.discount.removed', entityType: AuditEntity.Season, entityId: seasonId, details: { key, before } });
      } catch (e) {
        logger.error('Error auditing season.discount.removed', e);
      }
    } catch (e) {
      logger.error('Error removing season discount config', e);
      throw e;
    }
  },
  async createDiscount(d: Partial<Discount>): Promise<string> {
    try {
      const payload = this.normalizePayload(d);
      console.debug('firebaseDiscounts.createDiscount payload:', payload);
      // strip deprecated/unused fields if present
      if ((payload as any).scope) delete (payload as any).scope;
      if ((payload as any).year) delete (payload as any).year;
      // global discounts must not include per-season timing
      if ((payload as any).startDate) delete (payload as any).startDate;
      if ((payload as any).endDate) delete (payload as any).endDate;
      // derive stable slug id from code if not provided
      const baseId = (payload.id as string) || (payload.code ? slugify(String(payload.code)) : null);
      let id = baseId || `discount_${Date.now()}`;

      // ensure no duplicate code (case-insensitive) or id
      try {
        const allSnap = await get(ref(db, 'discounts'));
        const data = allSnap.exists() ? allSnap.val() : {};
        const entries = Object.entries(data) as [string, any][];
        if (payload.code) {
          const normCode = String(payload.code).trim().toLowerCase();
          const dup = entries.find(([, v]) => String((v as any).code || '').trim().toLowerCase() === normCode);
          if (dup) throw new Error('A discount with that code already exists');
        }
        const idTaken = entries.find(([k]) => k === id);
        if (idTaken) {
          // if id taken, append suffix until unique
          let suffix = 1;
          while (entries.find(([k]) => k === `${id}-${suffix}`)) {
            suffix += 1;
          }
          id = `${id}-${suffix}`;
        }
      } catch (e) {
        if ((e as Error).message === 'A discount with that code already exists') throw e;
        logger.error('Error checking duplicate discounts', e);
      }

      // Enforce sibling defaults for SIBLING code
      try {
        const codeNorm = (payload.code || '').toString().trim().toLowerCase();
        const idNorm = (id || '').toString().trim().toLowerCase();
        if (codeNorm === 'sibling' || idNorm === 'sibling') {
          (payload as any).amountType = 'fixed';
          (payload as any).appliesTo = 'line_item';
          (payload as any).perAdditional = true;
          // Default perAdditionalAmounts to [10,10,10] (2nd,3rd,4th+)
          if (!Array.isArray((payload as any).perAdditionalAmounts) || (payload as any).perAdditionalAmounts.length === 0) {
            (payload as any).perAdditionalAmounts = [10, 10, 10];
          }
          // Default primary (first) registrant amount to 0 if not provided
          if ((payload as any).amount === undefined || (payload as any).amount === null) {
            (payload as any).amount = 0;
          }
        } else {
          // Non-sibling discounts must not be per-additional
          (payload as any).perAdditional = false;
          if ((payload as any).perAdditionalAmounts) delete (payload as any).perAdditionalAmounts;
        }
      } catch (e) {
        logger.error('Error applying sibling defaults', e);
      }
      const toWrite: any = { ...payload };
      // do not store the `id` property inside the object; the DB key is the canonical id
      if (toWrite.id !== undefined) delete toWrite.id;
      Object.keys(toWrite).forEach(k => { if (toWrite[k] === undefined) delete toWrite[k]; });
      await set(ref(db, `discounts/${id}`), toWrite);
      try {
        await auditLogService.log({ action: 'discount.created', entityType: AuditEntity.Discount, entityId: id, details: toWrite });
      } catch (e) {
        logger.error('Error auditing discount.created', e);
      }
      return id;
    } catch (e) {
      logger.error('Error creating discount', e);
      throw e;
    }
  },
  async updateDiscount(id: string, updates: Partial<Discount>): Promise<void> {
    try {
      const payload = this.normalizePayload(updates);
      console.debug('firebaseDiscounts.updateDiscount id:', id, 'payload:', payload);
      // strip deprecated/unused fields if present
      if ((payload as any).scope) delete (payload as any).scope;
      if ((payload as any).year) delete (payload as any).year;
      // global discounts must not include per-season timing
      if ((payload as any).startDate) delete (payload as any).startDate;
      if ((payload as any).endDate) delete (payload as any).endDate;
      const cleaned: any = { ...payload };
      Object.keys(cleaned).forEach(k => { if (cleaned[k] === undefined) delete cleaned[k]; });
      // prevent changing code to a duplicate value
      if (payload.code) {
              // Enforce sibling defaults when updating to SIBLING
              try {
                const codeNorm = (payload.code || '').toString().trim().toLowerCase();
                if (codeNorm === 'sibling') {
                  (payload as any).amountType = 'fixed';
                  (payload as any).appliesTo = 'line_item';
                  (payload as any).perAdditional = true;
                  if (!Array.isArray((payload as any).perAdditionalAmounts) || (payload as any).perAdditionalAmounts.length === 0) {
                    (payload as any).perAdditionalAmounts = [10, 10, 10];
                  }
                  if ((payload as any).amount === undefined || (payload as any).amount === null) {
                    (payload as any).amount = 0;
                  }
                } else {
                  // ensure non-sibling updates cannot enable perAdditional
                  (payload as any).perAdditional = false;
                  if ((payload as any).perAdditionalAmounts) delete (payload as any).perAdditionalAmounts;
                }
              } catch (e) {
                logger.error('Error applying sibling defaults on update', e);
              }

        try {
          const allSnap = await get(ref(db, 'discounts'));
          const data = allSnap.exists() ? allSnap.val() : {};
          const entries = Object.entries(data) as [string, any][];
          const normCode = String(payload.code).trim().toLowerCase();
          const dup = entries.find(([k, v]) => k !== id && String((v as any).code || '').trim().toLowerCase() === normCode);
          if (dup) throw new Error('A discount with that code already exists');
        } catch (e) {
          if ((e as Error).message === 'A discount with that code already exists') throw e;
          logger.error('Error checking duplicate discount code on update', e);
        }
      }

      const r = ref(db, `discounts/${id}`);
      const snap = await get(r);
      const existing = snap.exists() ? (snap.val() || {}) : {};
      // existing may have an `id` property from older records; ensure we don't re-write it into DB
      if ((existing as any).id !== undefined) delete (existing as any).id;
      // Preserve explicit active boolean preference: if cleaned contains active boolean, use it; else keep existing
      const merged = { ...existing, ...cleaned };
      if (cleaned.active === undefined && typeof existing.active === 'boolean') merged.active = existing.active;
      // ensure we don't write an `id` property into the stored object
      if ((merged as any).id !== undefined) delete (merged as any).id;
      await set(r, merged);
      try {
        await auditLogService.log({ action: 'discount.updated', entityType: AuditEntity.Discount, entityId: id, details: { before: existing, after: cleaned } });
      } catch (e) {
        logger.error('Error auditing discount.updated', e);
      }
    } catch (e) {
      logger.error('Error updating discount', e);
      throw e;
    }
  },
  async deleteDiscount(id: string): Promise<void> {
    try {
      const r = ref(db, `discounts/${id}`);
      const snap = await get(r);
      const before = snap.exists() ? snap.val() : null;
      await set(r, null as any);
      try {
        await auditLogService.logDelete(AuditEntity.Discount, id, before);
      } catch (e) {
        logger.error('Error auditing discount.deleted', e);
      }
    } catch (e) {
      logger.error('Error deleting discount', e);
      throw e;
    }
  },

  // Ensure default global discounts exist (idempotent). Returns array of created ids.
  async ensureDefaultGlobalDiscounts(): Promise<string[]> {
    try {
      const snap = await get(ref(db, 'discounts'));
      const existing = snap.exists() ? snap.val() : {};
      const defaults: Record<string, Partial<Discount>> = {
        sibling: {
          code: 'SIBLING',
          amountType: 'fixed',
          amount: 0,
          appliesTo: 'line_item',
          perAdditional: true,
          perAdditionalAmounts: [10,10,10],
          minRegistrationsPerFamily: 2,
          allowedProgramTemplateIds: ['baseball-recreation', 'softball-recreation'],
          active: true,
          description: 'Sibling discount for rec programs only',
        },
        earlybird: {
          code: 'EARLYBIRD',
          amountType: 'fixed',
          amount: 15,
          appliesTo: 'line_item',
          allowedProgramTemplateIds: ['baseball-recreation', 'softball-recreation'],
          active: true,
          description: 'Early registration discount for rec programs',
        },
        blackfriday: {
          code: 'BLACKFRIDAY',
          amountType: 'fixed',
          amount: 25,
          appliesTo: 'line_item',
          allowedProgramTemplateIds: ['baseball-recreation', 'softball-recreation'],
          active: true,
          description: 'Black Friday promotional discount',
        },
        cybermonday: {
          code: 'CYBERMONDAY',
          amountType: 'fixed',
          amount: 20,
          appliesTo: 'line_item',
          allowedProgramTemplateIds: ['baseball-recreation', 'softball-recreation'],
          active: true,
          description: 'Cyber Monday promotional discount',
        },
      };

      const created: string[] = [];
      for (const [id, payload] of Object.entries(defaults)) {
        if (!existing || !existing[id]) {
          // use createDiscount to get normalization and audit logging
          await this.createDiscount({ id, ...payload } as any);
          created.push(id);
        }
      }
      return created;
    } catch (e) {
      logger.error('Error ensuring default global discounts', e);
      throw e;
    }
  },
};

export default firebaseDiscounts;
