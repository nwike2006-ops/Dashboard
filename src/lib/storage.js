import { useState } from 'react';

export function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysBetween(aStr, bStr) {
  const a = new Date(aStr + 'T00:00:00');
  const b = new Date(bStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently, state stays in-memory for the session
  }
}

// Persisted React state backed by localStorage, keyed by `key`. Same shape as useState.
export function useStored(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));
  const update = (next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      write(key, resolved);
      return resolved;
    });
  };
  return [value, update];
}

// Streak helper: given the date a thing was last completed and today's date, returns the
// new streak count if marking complete today (idempotent — completing twice same day no-ops).
export function nextStreak(lastCompletedDate, currentStreak) {
  const today = todayStr();
  if (lastCompletedDate === today) return currentStreak;
  if (lastCompletedDate && daysBetween(lastCompletedDate, today) === 1) return currentStreak + 1;
  return 1;
}
