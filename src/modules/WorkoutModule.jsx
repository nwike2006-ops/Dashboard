import { getSession, splitDayForWeekday, TOTAL_WEEKS, PROGRAM_NOTES } from '../data/workoutPlan';
import { todayStr, daysBetween } from '../lib/storage';
import { useSupabaseState } from '../lib/supabaseState';

const DEFAULT_STATE = {
  startDate: null, // resolved to today on first use, see useWorkoutState
  logs: {}, // { [exerciseName]: { [date]: [{weight, reps}, ...] } }
};

export function useWorkoutState() {
  const [state, setState, loading] = useSupabaseState('workout', DEFAULT_STATE);
  const startDate = state.startDate ?? todayStr();
  return [{ ...state, startDate }, setState, loading];
}

function weekNumberFor(startDate, dateStr) {
  const diff = daysBetween(startDate, dateStr);
  return Math.min(TOTAL_WEEKS, Math.floor(diff / 7) + 1);
}

function lastSessionFor(logs, exerciseName, beforeDate) {
  const byDate = logs[exerciseName] || {};
  const dates = Object.keys(byDate).filter((d) => d < beforeDate).sort();
  if (dates.length === 0) return null;
  const lastDate = dates[dates.length - 1];
  return { date: lastDate, sets: byDate[lastDate] };
}

export default function WorkoutModule({ state, setState }) {
  const today = todayStr();
  const weekday = new Date(today + 'T00:00:00').getDay();
  const weekNumber = weekNumberFor(state.startDate, today);
  const dayKey = splitDayForWeekday(weekday);
  const programDone = daysBetween(state.startDate, today) >= TOTAL_WEEKS * 7;

  function setSet(exerciseName, setIndex, field, value) {
    setState((prev) => {
      const byDate = { ...(prev.logs[exerciseName] || {}) };
      const sets = [...(byDate[today] || [])];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      byDate[today] = sets;
      return { ...prev, logs: { ...prev.logs, [exerciseName]: byDate } };
    });
  }

  if (programDone) {
    return (
      <div className="card">
        <div className="card-header"><h2>Workout</h2></div>
        <p className="module-note">24-week program complete. Time to reassess and plan the next cycle — nice work.</p>
      </div>
    );
  }

  if (!dayKey) {
    return (
      <div className="card">
        <div className="card-header">
          <h2>Workout</h2>
          <span className="pill">Week {weekNumber} of {TOTAL_WEEKS}</span>
        </div>
        <p className="module-note">Rest day. {PROGRAM_NOTES.schedule}</p>
      </div>
    );
  }

  const session = getSession(weekNumber, dayKey);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Workout — {dayKey}</h2>
        <span className="pill">{session.isDeload ? 'Deload' : session.phaseName} · Week {weekNumber}</span>
      </div>
      <p className="module-note">{session.focus}</p>
      <div className="exercise-table">
        {session.exercises.map((ex) => {
          const last = lastSessionFor(state.logs, ex.name, today);
          const todaysSets = (state.logs[ex.name] || {})[today] || [];
          return (
            <div className="exercise-row" key={ex.name}>
              <div className="exercise-name">
                {ex.name}
                <span className="exercise-target">{ex.sets} × {ex.reps}</span>
                {last && (
                  <span className="exercise-last">
                    Last: {last.sets.filter(s => s?.weight || s?.reps).map((s) => `${s.weight ?? '-'}×${s.reps ?? '-'}`).join(', ') || '—'}
                  </span>
                )}
              </div>
              <div className="set-inputs">
                {Array.from({ length: ex.sets }).map((_, i) => (
                  <div className="set-input" key={i}>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="lb"
                      value={todaysSets[i]?.weight ?? ''}
                      onChange={(e) => setSet(ex.name, i, 'weight', e.target.value)}
                    />
                    <span>×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="reps"
                      value={todaysSets[i]?.reps ?? ''}
                      onChange={(e) => setSet(ex.name, i, 'reps', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="module-note">{PROGRAM_NOTES.progression}</p>
    </div>
  );
}
