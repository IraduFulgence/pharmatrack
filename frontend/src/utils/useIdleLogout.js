import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/** Signed-in users are signed out after this long without any activity. */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

// Shared between tabs, so activity in one tab keeps the others signed in too.
const LAST_ACTIVITY_KEY = 'lastActivityAt';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
// Writing on every mouse move is wasteful; once every few seconds is plenty.
const WRITE_EVERY_MS = 5000;

const readLastActivity = () => {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
};

const writeLastActivity = (at) => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
  } catch {
    // Storage blocked: the timer in this tab still works.
  }
};

/**
 * Signs the user out after IDLE_TIMEOUT_MS without mouse, keyboard, touch or scroll activity,
 * then sends them to the login page with a note saying why.
 * Does nothing while nobody is signed in.
 */
export function useIdleLogout() {
  const navigate = useNavigate();
  const lastWrite = useRef(0);

  useEffect(() => {
    if (!localStorage.getItem('token')) return undefined;

    // Coming back to a tab that sat idle past the limit (e.g. after sleep) signs out at once.
    const last = readLastActivity();
    const now = Date.now();
    if (!last) writeLastActivity(now);

    let timer;

    const signOut = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      navigate('/login', { replace: true, state: { reason: 'idle' } });
    };

    const schedule = () => {
      clearTimeout(timer);
      const remaining = readLastActivity() + IDLE_TIMEOUT_MS - Date.now();
      if (remaining <= 0) {
        signOut();
        return;
      }
      timer = setTimeout(schedule, remaining);
    };

    const onActivity = () => {
      const at = Date.now();
      if (at - lastWrite.current < WRITE_EVERY_MS) return;
      lastWrite.current = at;
      writeLastActivity(at);
      schedule();
    };

    // Another tab was active, or signed out.
    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) signOut();
      else if (e.key === LAST_ACTIVITY_KEY) schedule();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') schedule();
    };

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    schedule();

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [navigate]);
}
