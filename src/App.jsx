import './App.css';
import TodayStrip from './modules/TodayStrip';
import BibleModule, { useBibleState } from './modules/BibleModule';
import WorkoutModule, { useWorkoutState } from './modules/WorkoutModule';
import BudgetModule, { useBudgetState } from './modules/BudgetModule';

const TODAY_LABEL = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

function App() {
  const [bibleState, setBibleState] = useBibleState();
  const [workoutState, setWorkoutState] = useWorkoutState();
  const [budgetState, setBudgetState] = useBudgetState();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <span className="dashboard-date">{TODAY_LABEL}</span>
      </header>

      <TodayStrip bibleState={bibleState} workoutState={workoutState} budgetState={budgetState} />

      <div className="module-grid">
        <WorkoutModule state={workoutState} setState={setWorkoutState} />
        <BibleModule state={bibleState} setState={setBibleState} />
        <BudgetModule state={budgetState} setState={setBudgetState} />
      </div>
    </div>
  );
}

export default App;
