import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import { expandDayReading, getRawDayLabel } from '../data/biblePlan';
import { splitDayForWeekday } from '../data/workoutPlan';
import { oilStatus } from '../modules/CarModule';
import { todayStr } from '../lib/storage';
import { useBudgetTransactions } from '../lib/useBudgetTransactions';

function currentMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function Tile({ to, accent, label, value, valueClass, sub }) {
  return (
    <Link to={to} className={`tile tile-${accent}`}>
      <div className="tile-top">
        <span className="tile-label">
          <span className="tile-dot" aria-hidden="true" />
          {label}
        </span>
        <span className="tile-chevron">›</span>
      </div>
      <div className={`tile-value ${valueClass || ''}`}>{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </Link>
  );
}

export default function Home({ bibleState, carState, budgetState }) {
  const today = todayStr();
  const { transactions } = useBudgetTransactions();

  const weekday = new Date(today + 'T00:00:00').getDay();
  const dayKey = splitDayForWeekday(weekday);

  const chapters = expandDayReading(bibleState.currentDay);
  const checkedKeys = new Set(bibleState.checked[bibleState.currentDay] || []);
  const bibleDone = chapters.length > 0 && chapters.every((c) => checkedKeys.has(c.key));

  const monthTx = transactions.filter((t) => currentMonthKey(t.date) === currentMonthKey(today));
  const totalBudgeted = budgetState.categories.reduce((sum, c) => sum + Number(c.monthlyBudget || 0), 0);
  const totalSpent = monthTx.reduce((sum, t) => sum + Number(t.amount), 0);
  const remaining = totalBudgeted - totalSpent;

  const car = carState.oilChanges.length > 0 ? oilStatus(carState) : null;

  return (
    <div className="dashboard">
      <AppHeader />

      <div className="tile-grid">
        <Tile
          to="/workout"
          accent="workout"
          label="Workout"
          value={dayKey || 'Rest day'}
          sub={dayKey ? "Today's session" : 'Nothing scheduled today'}
        />
        <Tile
          to="/bible"
          accent="bible"
          label="Bible Reading"
          value={getRawDayLabel(bibleState.currentDay)}
          valueClass={bibleDone ? 'good' : ''}
          sub={`${checkedKeys.size}/${chapters.length} chapters${bibleState.streak > 0 ? ` · ${bibleState.streak}-day streak` : ''}`}
        />
        <Tile
          to="/car"
          accent="car"
          label="Car Maintenance"
          value={car ? car.text : (carState.fillups.length > 0 ? `${carState.fillups[0].mileage.toLocaleString()} mi` : 'No data yet')}
          valueClass={car ? (car.level === 'ok' ? 'good' : car.level === 'overdue' ? 'bad' : '') : ''}
          sub={car ? 'Oil change status' : 'Tap to log a fill-up'}
        />
        <Tile
          to="/budget"
          accent="budget"
          label="Budget"
          value={totalBudgeted === 0 ? 'Not set up' : `$${remaining.toFixed(0)} left`}
          valueClass={totalBudgeted === 0 ? '' : remaining < 0 ? 'bad' : 'good'}
          sub={totalBudgeted === 0 ? 'Tap to set your categories' : `$${totalSpent.toFixed(0)} spent this month`}
        />
      </div>
    </div>
  );
}
