import { expandDayReading, getRawDayLabel, anchorDayNumberForDate, PLAN_LENGTH } from '../data/biblePlan';
import { useStored, todayStr, nextStreak } from '../lib/storage';

const DEFAULT_STATE = {
  currentDay: null, // resolved on first read below
  checked: {}, // { [dayNumber]: string[] of chapter keys }
  streak: 0,
  lastCompletedDate: null,
};

export function useBibleState() {
  const [state, setState] = useStored('ld_bible', DEFAULT_STATE);
  const currentDay = state.currentDay ?? anchorDayNumberForDate(todayStr());
  return [{ ...state, currentDay }, setState];
}

export default function BibleModule({ state, setState }) {
  const { currentDay, checked, streak } = state;
  const chapters = expandDayReading(currentDay);
  const checkedKeys = new Set(checked[currentDay] || []);
  const allDone = chapters.length > 0 && chapters.every((c) => checkedKeys.has(c.key));

  function toggleChapter(key) {
    setState((prev) => {
      const set = new Set(prev.checked[currentDay] || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, checked: { ...prev.checked, [currentDay]: [...set] } };
    });
  }

  function goToDay(day) {
    const wrapped = ((day - 1) % PLAN_LENGTH + PLAN_LENGTH) % PLAN_LENGTH + 1;
    setState((prev) => ({ ...prev, currentDay: wrapped }));
  }

  function completeDay() {
    setState((prev) => ({
      ...prev,
      currentDay: currentDay >= PLAN_LENGTH ? 1 : currentDay + 1,
      streak: nextStreak(prev.lastCompletedDate, prev.streak),
      lastCompletedDate: todayStr(),
    }));
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Bible Reading</h2>
        <span className="pill">{streak > 0 ? `${streak}-day streak` : 'Chronological plan'}</span>
      </div>
      <div className="bible-daynav">
        <button className="icon-btn" onClick={() => goToDay(currentDay - 1)} aria-label="Previous day">←</button>
        <div className="bible-day-label">
          <div className="bible-day-number">Day {currentDay} of {PLAN_LENGTH}</div>
          <div className="bible-day-ref">{getRawDayLabel(currentDay)}</div>
        </div>
        <button className="icon-btn" onClick={() => goToDay(currentDay + 1)} aria-label="Next day">→</button>
      </div>
      <ul className="chapter-list">
        {chapters.map((c) => (
          <li key={c.key}>
            <label className={checkedKeys.has(c.key) ? 'checked' : ''}>
              <input
                type="checkbox"
                checked={checkedKeys.has(c.key)}
                onChange={() => toggleChapter(c.key)}
              />
              {c.label}
            </label>
          </li>
        ))}
      </ul>
      {allDone && (
        <button className="primary-btn" onClick={completeDay}>
          Mark Day {currentDay} complete → Day {currentDay >= PLAN_LENGTH ? 1 : currentDay + 1}
        </button>
      )}
      <p className="module-note">
        Rebuilt from the Blue Letter Bible chronological plan — lives here since it can't sync with your phone app. Fell behind or read ahead? Use the arrows to jump to the right day.
      </p>
    </div>
  );
}
