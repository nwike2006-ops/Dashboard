import { expandDayReading } from '../data/biblePlan';
import { getSession, splitDayForWeekday } from '../data/workoutPlan';
import { oilStatus } from './CarModule';
import { todayStr } from '../lib/storage';

function currentMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

export default function TodayStrip({ bibleState, workoutState, budgetState, carState }) {
  const today = todayStr();

  const chapters = expandDayReading(bibleState.currentDay);
  const checkedKeys = new Set(bibleState.checked[bibleState.currentDay] || []);
  const bibleDone = chapters.length > 0 && chapters.every((c) => checkedKeys.has(c.key));
  const bibleText = chapters.length === 0 ? '—' : `${checkedKeys.size}/${chapters.length} chapters`;

  const weekday = new Date(today + 'T00:00:00').getDay();
  const dayKey = splitDayForWeekday(weekday);
  const workoutText = dayKey ? dayKey : 'Rest day';

  const monthTx = budgetState.transactions.filter((t) => currentMonthKey(t.date) === currentMonthKey(today));
  const totalBudgeted = budgetState.categories.reduce((sum, c) => sum + Number(c.monthlyBudget || 0), 0);
  const totalSpent = monthTx.reduce((sum, t) => sum + Number(t.amount), 0);
  const remaining = totalBudgeted - totalSpent;

  const car = carState.oilChanges.length > 0 ? oilStatus(carState) : null;

  return (
    <div className="today-strip">
      <div className="today-item">
        <span className="today-label">Workout</span>
        <span className="today-value">{workoutText}</span>
      </div>
      <div className="today-item">
        <span className="today-label">Bible</span>
        <span className={`today-value ${bibleDone ? 'good' : ''}`}>{bibleText}</span>
      </div>
      <div className="today-item">
        <span className="today-label">Budget left</span>
        <span className={`today-value ${totalBudgeted === 0 ? '' : remaining < 0 ? 'bad' : 'good'}`}>
          {totalBudgeted === 0 ? 'Not set up' : `$${remaining.toFixed(0)}`}
        </span>
      </div>
      {car && (
        <div className="today-item">
          <span className="today-label">Car</span>
          <span className={`today-value ${car.level === 'ok' ? 'good' : car.level === 'overdue' ? 'bad' : ''}`}>
            {car.level === 'ok' ? 'On track' : car.level === 'due-soon' ? 'Due soon' : 'Overdue'}
          </span>
        </div>
      )}
      {bibleState.streak > 0 && (
        <div className="today-item">
          <span className="today-label">Reading streak</span>
          <span className="today-value good">{bibleState.streak} day{bibleState.streak === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  );
}
