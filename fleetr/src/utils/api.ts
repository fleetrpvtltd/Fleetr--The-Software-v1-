/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from '../lib/firebase';

const SESSION_KEY = 'fleetr_session';

export function saveLocalUser(user: any) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getLocalUser(): any {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // If Firebase user isn't immediately loaded, wait briefly for authStateReady
  if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
    try {
      await Promise.race([
        (auth as any).authStateReady(),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {
      // ignore
    }
  }

  const firebaseUser = auth.currentUser;
  let tokenSet = false;

  if (firebaseUser) {
    try {
      const idToken = await firebaseUser.getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
        tokenSet = true;
      }
    } catch (err) {
      console.warn('Failed to obtain Firebase ID token:', err);
    }
    if (firebaseUser.uid) {
      headers['X-User-Id'] = firebaseUser.uid;
    }
    if (firebaseUser.email) {
      headers['X-User-Email'] = firebaseUser.email;
    }
  }

  // Fallback to local session storage for active logged in user
  const localUser = getLocalUser();
  if (localUser && !tokenSet) {
    if (localUser.id) {
      headers['Authorization'] = `Bearer ${localUser.id}`;
      headers['X-User-Id'] = localUser.id;
      tokenSet = true;
    }
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const url = endpoint.startsWith('/api')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Request failed to ${endpoint}:`, error);
    throw error;
  }
}

