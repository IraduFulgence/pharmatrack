import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { actingSession } from '@/src/api/family/familyService';
import i18n from '@/src/i18n';


export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const LAST_ACTIVITY_KEY = 'lastActivityAt';
// Saving on every touch is wasteful; the in-memory time is exact, the saved one is for app restarts.
const SAVE_EVERY_MS = 15 * 1000;

/** Call right after a successful login so the timer starts fresh. */
export const markSessionActive = () =>
  SecureStore.setItemAsync(LAST_ACTIVITY_KEY, String(Date.now())).catch(() => undefined);

/**
 * Signs the patient out after IDLE_TIMEOUT_MS without a touch, including time the app spent
 * in the background or closed. Returns a handler to call on every touch.
 */
export function useInactivityLogout() {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const lastSaved = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signingOut = useRef(false);

  const signOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    if (timer.current) clearTimeout(timer.current);
    await actingSession.clear();
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync(LAST_ACTIVITY_KEY);
    router.replace('/auth/login');
    Alert.alert(
      i18n.t('session.signedOutTitle', 'Signed out'),
      i18n.t('session.signedOutBody', 'You were signed out after 5 minutes without activity. Log in again to continue.'),
    );
  }, [router]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const remaining = lastActivity.current + IDLE_TIMEOUT_MS - Date.now();
    if (remaining <= 0) {
      signOut();
      return;
    }
    timer.current = setTimeout(schedule, remaining);
  }, [signOut]);

  const onActivity = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    if (now - lastSaved.current > SAVE_EVERY_MS) {
      lastSaved.current = now;
      SecureStore.setItemAsync(LAST_ACTIVITY_KEY, String(now)).catch(() => undefined);
    }
    schedule();
  }, [schedule]);

  useEffect(() => {
    let mounted = true;

    // App reopened after a long break: the saved time decides.
    (async () => {
      const saved = Number(await SecureStore.getItemAsync(LAST_ACTIVITY_KEY)) || 0;
      if (!mounted) return;
      if (saved) lastActivity.current = saved;
      else markSessionActive();
      schedule();
    })();

    // Timers don't run in the background, so check again when the app comes back.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
      else SecureStore.setItemAsync(LAST_ACTIVITY_KEY, String(lastActivity.current)).catch(() => undefined);
    });

    return () => {
      mounted = false;
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [schedule]);

  return onActivity;
}
