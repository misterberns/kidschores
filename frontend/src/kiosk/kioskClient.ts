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

export interface KioskState {
  device_name: string;
  kids: KioskKid[];
}

export const kioskApi = {
  state: () => kioskHttp.get<KioskState>('/kiosk/state').then((r) => r.data),
  claim: (kidId: string, choreId: string) =>
    kioskHttp.post('/kiosk/claim', { kid_id: kidId, chore_id: choreId }).then((r) => r.data),
  endSession: () => kioskHttp.delete('/kiosk/session'),
};

/** True when an axios error means the device token is no longer valid. */
export function isKioskAuthError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}
