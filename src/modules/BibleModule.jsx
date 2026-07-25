import { expandDayReading, getRawDayLabel, anchorDayNumberForDate, PLAN_LENGTH } from '../data/biblePlan';
import { todayStr, daysBetween, addDays, nextStreak } from '../lib/storage';
import { useSupabaseState } from '../lib/supabaseState';

const DEFAULT_STATE = {
  currentDay: null, // resolved on first read below
  deadlineDate: null, // resolved on first read below — defaults to a 1-unit/day pace
  checked: {}, // { [dayNumber]: string[] of chapter keys }
  streak: 0,
  lastCompletedDate: null,
};

function wrapDay(n) {
  return ((n - 1) % PLAN_LENGTH + PLAN_LENGTH) % PLAN_LENGTH + 1;
}

function defaultDeadlineFor(currentDay) {
  return addDays(todayStr(), PLAN_LENGTH - currentDay);
}

// Auto-recalculating pace, same idea as Bible Box: however many plan-days are left,
// spread across however many calendar days are left until the deadline (never below 1/day).
function computePace(currentDay, deadlineDate, today) {
  const unitsRemaining = Math.max(1, PLAN_LENGTH - currentDay + 1);
  const daysRemaining = Math.max(1, daysBetween(today, deadlineDate) + 1);
  const unitsPerDay = Math.max(1, Math.ceil(unitsRemaining / daysRemaining));
  return { unitsRemaining, daysRemaining, unitsPerDay };
}

export function useBibleState() {
  const [state, setState, loading] = useSupabaseState('bible', DEFAULT_STATE);
  const currentDay = state.currentDay ?? anchorDayNumberForDate(todayStr());
  const deadlineDate = state.deadlineDate ?? defaultDeadlineFor(currentDay);
  return [{ ...state, currentDay, deadlineDate }, setState, loading];
}

export default function BibleModule({ state, setState }) {
  const { currentDay, deadlineDate, checked, streak } = state;
  const today = todayStr();
  const { unitsPerDay, daysRemaining } = computePace(currentDay, deadlineDate, today);

  const bundleDays = Array.from({ length: unitsPerDay }, (_, i) => wrapDay(currentDay + i));
  const bundleGroups = bundleDays.map((day) => ({
    day,
    label: getRawDayLabel(day),
    chapters: expandDayReading(day),
  }));
  const allChaptersInBundle = bundleGroups.flatMap((g) => g.chapters);
  const allDone = allChaptersInBundle.length > 0 && bundleGroups.every((g) =>
    g.chapters.every((c) => (checked[g.day] || []).includes(c.key))
  );

  function toggleChapter(day, key) {
    setState((prev) => {
      const set = new Set(prev.checked[day] || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, checked: { ...prev.checked, [day]: [...set] } };
    });
  }

  function goToDay(day) {
    setState((prev) => ({ ...prev, currentDay: wrapDay(day) }));
  }

  function completeToday() {
    setState((prev) => ({
      ...prev,
      currentDay: wrapDay(currentDay + unitsPerDay),
      streak: nextStreak(prev.lastCompletedDate, prev.streak),
      lastCompletedDate: today,
    }));
  }

  function setDeadline(value) {
    setState((prev) => ({ ...prev, deadlineDate: value }));
  }

  function resetPace() {
    setState((prev) => ({ ...prev, deadlineDate: defaultDeadlineFor(currentDay) }));
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Bible Reading</h2>
        <span className={`pill ${streak > 0 ? 'pill-good' : ''}`}>{streak > 0 ? `${streak}-day streak` : 'Chronological plan'}</span>
      </div>

      <div className="bible-daynav">
        <button className="icon-btn" onClick={() => goToDay(currentDay - 1)} aria-label="Previous day">←</button>
        <div className="bible-day-label">
          <div className="bible-day-number">
            Day {currentDay} of {PLAN_LENGTH}{unitsPerDay > 1 ? ` – ${wrapDay(currentDay + unitsPerDay - 1)}` : ''}
          </div>
          <div className="bible-day-ref">{bundleGroups.map((g) => g.label).join(' + ')}</div>
        </div>
        <button className="icon-btn" onClick={() => goToDay(currentDay + 1)} aria-label="Next day">→</button>
      </div>

      {bundleGroups.map((g) => {
        const checkedKeys = new Set(checked[g.day] || []);
        return (
          <div className="reading-day-group" key={g.day}>
            {unitsPerDay > 1 && <div className="reading-day-group-label">Day {g.day} · {g.label}</div>}
            <ul className="chapter-list">
              {g.chapters.map((c) => (
                <li key={c.key}>
                  <label className={checkedKeys.has(c.key) ? 'checked' : ''}>
                    <input
                      type="checkbox"
                      checked={checkedKeys.has(c.key)}
                      onChange={() => toggleChapter(g.day, c.key)}
                    />
                    {c.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {allDone && (
        <button className="primary-btn" onClick={completeToday}>
          Mark today complete → Day {wrapDay(currentDay + unitsPerDay)}
        </button>
      )}

      <div className="pace-control">
        <label>
          Finish by
          <input type="date" value={deadlineDate} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <span className="pace-readout">
          {unitsPerDay === 1
            ? `On pace — 1 reading/day, ${daysRemaining} days left`
            : `~${unitsPerDay} readings/day to hit that date`}
          {unitsPerDay > 7 && ' — that deadline might be unrealistic'}
        </span>
        <button className="secondary-btn" onClick={resetPace} type="button">Reset to standard pace</button>
      </div>

      <p className="module-note">
        Rebuilt from the Blue Letter Bible chronological plan — lives here since it can't sync with your phone app. Fell behind or read ahead? Use the arrows to jump to the right day, or move your deadline and the daily pace recalculates automatically.
      </p>
    </div>
  );
}
