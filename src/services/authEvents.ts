import { ref, push, get, update } from 'firebase/database';
import dayjs from 'dayjs';
import { db } from './firebase';
import logger from '../utils/logger';

export type AuthEventName = 'login_success' | 'login_failure';

export type AuthEventRecord = {
  event: AuthEventName;
  ts: string;
  uid?: string;
  email?: string | null;
  provider?: string;
  role?: string;
  reason?: string;
  ip?: string | null;
  userAgent?: string | null;
};

const AUTH_EVENTS_ROOT = 'authEvents';
const IP_CACHE_KEY = 'wgys.clientIp';

function isPermissionDeniedError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('permission denied');
}

function compactRecord<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as T;
}

async function getClientIp(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem(IP_CACHE_KEY);
    if (cached) return cached;
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) throw new Error(`ipify status ${res.status}`);
    const data = await res.json();
    if (data?.ip) {
      sessionStorage.setItem(IP_CACHE_KEY, data.ip);
      return data.ip;
    }
  } catch (err) {
    logger.info('authEvents: failed to resolve client IP (non-fatal)', err);
  }
  return null;
}

function formatDateKey(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export async function logAuthEvent(event: AuthEventName, payload: Omit<AuthEventRecord, 'event' | 'ts'> & { ts?: string }) {
  try {
    const now = payload.ts ? new Date(payload.ts) : new Date();
    const tsIso = now.toISOString();
    const dateKey = formatDateKey(now);
    const eventRef = ref(db, `${AUTH_EVENTS_ROOT}/${dateKey}`);
    const ip = payload.ip !== undefined ? payload.ip : await getClientIp();

    const record = compactRecord<AuthEventRecord>({
      event,
      ts: tsIso,
      uid: payload.uid,
      email: payload.email,
      provider: payload.provider,
      role: payload.role,
      reason: payload.reason,
      ip: ip || null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    await push(eventRef, record);
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      logger.error('authEvents: failed to log event', error);
    }
  }
}

function getDateKeysForRange(days: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = dayjs().subtract(i, 'day');
    keys.push(d.format('YYYY-MM-DD'));
  }
  return keys;
}

export async function fetchAuthEvents(days = 7): Promise<AuthEventRecord[]> {
  const keys = getDateKeysForRange(days);
  const events: AuthEventRecord[] = [];
  try {
    const snapshots = await Promise.all(keys.map((k) => get(ref(db, `${AUTH_EVENTS_ROOT}/${k}`))));
    snapshots.forEach((snap) => {
      if (snap.exists()) {
        const val = snap.val();
        Object.values(val).forEach((entry) => {
          events.push(entry as AuthEventRecord);
        });
      }
    });
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      logger.error('authEvents: failed to fetch events', error);
    }
  }
  return events;
}

export type AuthEventStats = {
  successToday: number;
  successAvg: number;
  failuresByReason: Array<{ reason: string; count: number; provider?: string }>;
  failuresTopUsers: Array<{ key: string; count: number; provider?: string; reason?: string }>;
  failuresByProvider: Array<{ provider: string; count: number }>;
};

export function computeAuthStats(events: AuthEventRecord[], days = 7, roleFilter?: string): AuthEventStats {
  const filteredEvents = roleFilter && roleFilter !== 'all'
    ? events.filter((e) => (e.role || 'unknown') === roleFilter)
    : events;
  const todayKey = formatDateKey(new Date());
  const successes: AuthEventRecord[] = [];
  const failures: AuthEventRecord[] = [];
  const dayBuckets: Record<string, number> = {};

  filteredEvents.forEach((e) => {
    const dateKey = e.ts ? formatDateKey(new Date(e.ts)) : todayKey;
    if (e.event === 'login_success') {
      successes.push(e);
      dayBuckets[dateKey] = (dayBuckets[dateKey] || 0) + 1;
    } else {
      failures.push(e);
    }
  });

  const successToday = successes.filter((e) => formatDateKey(new Date(e.ts)) === todayKey).length;
  const totalSuccess = successes.length;
  const successAvg = days > 0 ? Math.round(totalSuccess / days) : totalSuccess;

  const reasonMap: Record<string, { count: number; provider?: string }> = {};
  failures.forEach((f) => {
    const key = f.reason || 'unknown';
    if (!reasonMap[key]) reasonMap[key] = { count: 0, provider: f.provider };
    reasonMap[key].count += 1;
  });
  const failuresByReason = Object.entries(reasonMap)
    .map(([reason, data]) => ({ reason, count: data.count, provider: data.provider }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const providerMap: Record<string, number> = {};
  failures.forEach((f) => {
    const key = f.provider || 'unknown';
    providerMap[key] = (providerMap[key] || 0) + 1;
  });
  const failuresByProvider = Object.entries(providerMap)
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count);

  const userKeyMap: Record<string, { count: number; provider?: string; reason?: string }> = {};
  failures.forEach((f) => {
    const key = f.uid || f.email || f.ip || 'unknown';
    if (!userKeyMap[key]) userKeyMap[key] = { count: 0, provider: f.provider, reason: f.reason };
    userKeyMap[key].count += 1;
  });
  const failuresTopUsers = Object.entries(userKeyMap)
    .map(([key, data]) => ({ key, count: data.count, provider: data.provider, reason: data.reason }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    successToday,
    successAvg,
    failuresByReason,
    failuresTopUsers,
    failuresByProvider,
  };
}

export async function getAuthEventStats(days = 7, roleFilter?: string): Promise<AuthEventStats> {
  const events = await fetchAuthEvents(days);
  return computeAuthStats(events, days, roleFilter);
}

export async function updateLastLogin(uid: string, data: { provider?: string | null; lastLoginAt?: string; ip?: string | null }) {
  try {
    const ts = data.lastLoginAt || new Date().toISOString();
    await update(ref(db, `users/${uid}`), {
      lastLoginAt: ts,
      lastLoginProvider: data.provider || null,
      lastLoginIp: data.ip || null,
    });
  } catch (error) {
    logger.error('authEvents: failed to update last login', error);
  }
}
