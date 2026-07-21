import { Link } from 'react-router-dom';
import { todayLabel } from '../lib/storage';

export default function AppHeader({ back }) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        {back ? (
          <Link to="/" className="app-header-back">
            <span aria-hidden="true">←</span> Dashboard
          </Link>
        ) : (
          <span className="app-header-brand">
            <span className="app-header-mark" aria-hidden="true" />
            Dashboard
          </span>
        )}
      </div>
      <span className="app-header-date">{todayLabel()}</span>
    </header>
  );
}
