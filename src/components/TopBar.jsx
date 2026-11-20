import { UserIcon, HelpIcon, SettingsIcon, LogoutIcon } from './icons';

// Shown on every page (TopBar renders above the view switcher in App.jsx),
// not just Overview — so there's always a quick answer to "how much do I
// have left" without navigating anywhere. Chase Checking specifically
// (not net worth, which is the Sidebar footer's "Total") — that's the
// account actually spent from day to day.
export default function TopBar({ checkingBalance }) {
  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <span className="top-bar-mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <span className="top-bar-brand-text">BudgetTemplate</span>
      </div>
      {checkingBalance != null && (
        <span className="top-bar-balance">${checkingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      )}
      <div className="top-bar-actions">
        <button className="top-bar-icon-btn" type="button" aria-label="Profile">
          <UserIcon />
        </button>
        <button className="top-bar-icon-btn" type="button" aria-label="Help">
          <HelpIcon />
        </button>
        <button className="top-bar-icon-btn" type="button" aria-label="Settings">
          <SettingsIcon />
        </button>
        <button className="top-bar-icon-btn" type="button" aria-label="Log out">
          <LogoutIcon />
        </button>
      </div>
    </header>
  );
}
