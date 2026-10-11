export function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

// How far into the current calendar month today is — the budget period
// this app tracks against (see Budget.jsx's month nav). daysLeft counts
// today itself as still "left" (last day of the month = 1 day left, not 0),
// since spending can still happen today.
export function monthProgress() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  return { daysInMonth, dayOfMonth, daysLeft: daysInMonth - dayOfMonth + 1 };
}

export function daysBetween(aStr, bStr) {
  const a = new Date(aStr + 'T00:00:00');
  const b = new Date(bStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

export function addMonths(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return formatDate(d);
}

// Streak helper: given the date a thing was last completed and today's date, returns the
// new streak count if marking complete today (idempotent — completing twice same day no-ops).
export function nextStreak(lastCompletedDate, currentStreak) {
  const today = todayStr();
  if (lastCompletedDate === today) return currentStreak;
  if (lastCompletedDate && daysBetween(lastCompletedDate, today) === 1) return currentStreak + 1;
  return 1;
}
