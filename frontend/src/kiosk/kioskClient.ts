import axios from 'axios';
import type { TodaysChore } from '../api/client';

/**
 * Kiosk mode (v0.18.0) talks to /api/kiosk/* with a claim-only device token.
 *
 * It uses its OWN axios instance on purpose: the main `api` client carries the
 * parent/kid JWT plus AuthContext's refresh-on-401 handling, and a kiosk 401 means
 * "this device was revoked", not "refresh the session".
 */
export const KIOSK_TOKEN_KEY = 'kc_kiosk_token';

export function getKioskToken(): string | null {
  try {
    return localStorage.getItem(KIOSK_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setKioskToken(token: string): void {
  localStorage.setItem(KIOSK_TOKEN_KEY, token);
}

export function clearKioskToken(): void {
  try {
    localStorage.removeItem(KIOSK_TOKEN_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

const kioskHttp = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

kioskHttp.interceptors.request.use((config) => {
  const token = getKioskToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface KioskKid {
  id: string;
  name: string;
  points: number;
  chores: TodaysChore[];
}

/** A grown-up assigned chores (v0.19.0): done instantly, no points. */
export interface KioskAdult {
  id: string;
  name: string;
  chores: TodaysChore[];
}

export interface KioskState {
  device_name: string;
  kids: KioskKid[];
  adults: KioskAdult[];
  /** At least one parent has a PIN, so approving on the kiosk is possible. */
  parent_pin_set: boolean;
}

export interface KioskPendingClaim {
  chore_id: string;
  kid_id: string;
  kid_name: string;
  chore_name: string;
  points: number;
  claimed_at: string;
}

const ticketHeader = (ticket: string) => ({ headers: { 'X-Kiosk-Parent': ticket } });

export const kioskApi = {
  state: () => kioskHttp.get<KioskState>('/kiosk/state').then((r) => r.data),
  claim: (kidId: string, choreId: string) =>
    kioskHttp.post('/kiosk/claim', { kid_id: kidId, chore_id: choreId }).then((r) => r.data),
  endSession: () => kioskHttp.delete('/kiosk/session'),
  /** A grown-up marks their own chore done: instant, no approval (v0.19.0). */
  adultDone: (parentId: string, choreId: string) =>
    kioskHttp.post('/kiosk/adult-done', { parent_id: parentId, chore_id: choreId }).then((r) => r.data),
  /** Parent PIN -> a 2-minute approval ticket for THIS device (v0.19.0). Never stored. */
  unlock: (pin: string) =>
    kioskHttp
      .post<{ ticket: string; parent_name: string; expires_in: number }>('/kiosk/parent/unlock', { pin })
      .then((r) => r.data),
  pending: (ticket: string) =>
    kioskHttp.get<KioskPendingClaim[]>('/kiosk/parent/pending', ticketHeader(ticket)).then((r) => r.data),
  approve: (ticket: string, kidId: string, choreId: string) =>
    kioskHttp.post('/kiosk/parent/approve', { kid_id: kidId, chore_id: choreId }, ticketHeader(ticket)),
  reject: (ticket: string, kidId: string, choreId: string) =>
    kioskHttp.post('/kiosk/parent/reject', { kid_id: kidId, chore_id: choreId }, ticketHeader(ticket)),
  /** Anonymous: exchange a parent's one-time pairing code for this device's token (v0.18.2). */
  pair: (code: string) =>
    kioskHttp.post<{ token: string; name: string }>('/kiosk/pair', { code }).then((r) => r.data),
};

/** True when an axios error means the device token is no longer valid. */
export function isKioskAuthError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}
