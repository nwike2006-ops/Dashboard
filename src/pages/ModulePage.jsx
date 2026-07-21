import { Link } from 'react-router-dom';
import TodayStrip from '../modules/TodayStrip';

export default function ModulePage({ bibleState, workoutState, budgetState, carState, children }) {
  return (
    <div className="dashboard">
      <TodayStrip bibleState={bibleState} workoutState={workoutState} budgetState={budgetState} carState={carState} />
      <Link to="/" className="back-link">← Back to Dashboard</Link>
      <div className="module-page-content">{children}</div>
    </div>
  );
}
