import AppHeader from '../components/AppHeader';
import TodayStrip from '../modules/TodayStrip';

export default function ModulePage({ bibleState, workoutState, budgetState, carState, children }) {
  return (
    <div className="dashboard">
      <AppHeader back />
      <TodayStrip bibleState={bibleState} workoutState={workoutState} budgetState={budgetState} carState={carState} />
      <div className="module-page-content">{children}</div>
    </div>
  );
}
