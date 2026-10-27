import { useState } from 'react';

function normalize(desc) {
  return (desc || '').trim().toLowerCase();
}

// merchantInfo keys are short, stable merchant names (e.g. "whoop") while
// actual descriptions carry extra boilerplate ("WHOOP BOSTON MA 07/27") —
// a whole-word match on the key lets one entry cover every variant without
// false-positiving into an unrelated word that happens to contain it (e.g.
// the key "act" must not match inside "Gcu Canyon Activity").
function findMerchantInfo(merchantInfo, description) {
  if (!merchantInfo) return undefined;
  const norm = normalize(description);
  if (merchantInfo[norm]) return merchantInfo[norm];
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const key = Object.keys(merchantInfo).find((k) => new RegExp(`\\b${escapeRegex(k)}\\b`, 'i').test(norm));
  return key ? merchantInfo[key] : undefined;
}

// Plaid detail fields worth showing, in display order — skips any that are
// null/missing for a given transaction (manual entries have none of these).
const DETAIL_FIELDS = [
  ['category', 'Plaid category'],
  ['paymentChannel', 'Paid'],
  ['location', 'Location'],
  ['website', 'Website'],
];

function TxRow({ t, categories, onRecategorize, onToggleExcluded, merchantInfo }) {
  const [showDetails, setShowDetails] = useState(false);
  const details = t.details || {};
  const about = findMerchantInfo(merchantInfo, t.description);
  const hasDetails = Boolean(about) || DETAIL_FIELDS.some(([key]) => details[key]);

  return (
    <div className="tx-row">
      <span className="tx-date">{t.date.slice(5)}</span>
      <span className="tx-desc">
        <span className="tx-desc-main">
          {t.description}
          {t.source === 'plaid' && <span className="pill tx-source-pill">Synced</span>}
          {hasDetails && (
            <button type="button" className="tx-details-toggle" onClick={() => setShowDetails((v) => !v)}>
              Details {showDetails ? '▴' : '▾'}
            </button>
          )}
        </span>
        {showDetails && hasDetails && (
          <div className="tx-details-panel">
            {about && (
              <div className="tx-details-row">
                <span className="tx-details-label">What is this</span>
                <span>{about}</span>
              </div>
            )}
            {DETAIL_FIELDS.filter(([key]) => details[key]).map(([key, label]) => (
              <div className="tx-details-row" key={key}>
                <span className="tx-details-label">{label}</span>
                <span>{details[key]}</span>
              </div>
            ))}
          </div>
        )}
      </span>
      <span className={`tx-amount ${t.amount < 0 ? 'good' : ''}`}>
        {t.amount < 0 ? '+' : '-'}${Math.abs(Number(t.amount)).toFixed(2)}
      </span>
      <select value={t.categoryId || ''} onChange={(e) => onRecategorize(t.id, e.target.value)}>
        {/* A null categoryId (income deliberately left uncategorized) has no matching
            option below — without this, the browser silently selects the first real
            category instead, which looks like a lie about what this transaction is. */}
        {!t.categoryId && (
          <option value="" disabled>
            Uncategorized (income)
          </option>
        )}
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="tx-ignore-btn"
        title="Exclude this transaction from category spending totals without deleting it"
        onClick={() => onToggleExcluded(t.id, !t.excluded)}
      >
        {t.excluded ? 'Include' : 'Ignore'}
      </button>
    </div>
  );
}

// Splits any transaction list into what's actually active vs. what's been
// marked Ignored, so ignored transactions drop into their own collapsed
// "N ignored" drawer instead of cluttering the main list they came from.
export default function TxList({
  transactions,
  categories,
  onRecategorize,
  onToggleExcluded,
  merchantInfo,
  emptyLabel = 'Nothing here yet.',
}) {
  const [showIgnored, setShowIgnored] = useState(false);
  const active = transactions.filter((t) => !t.excluded);
  const ignored = transactions.filter((t) => t.excluded);

  if (active.length === 0 && ignored.length === 0) {
    return <p className="module-note">{emptyLabel}</p>;
  }

  return (
    <>
      {active.length > 0 ? (
        <div className="tx-table">
          {active.map((t) => (
            <TxRow
              key={t.id}
              t={t}
              categories={categories}
              onRecategorize={onRecategorize}
              onToggleExcluded={onToggleExcluded}
              merchantInfo={merchantInfo}
            />
          ))}
        </div>
      ) : (
        <p className="module-note">Everything here is currently ignored.</p>
      )}

      {ignored.length > 0 && (
        <div className="tx-ignored-drawer">
          <button type="button" className="category-expand-toggle" onClick={() => setShowIgnored((v) => !v)}>
            {showIgnored ? 'Hide' : 'Show'} {ignored.length} ignored {showIgnored ? '▴' : '▾'}
          </button>
          {showIgnored && (
            <div className="tx-table category-tx-table">
              {ignored.map((t) => (
                <TxRow
                  key={t.id}
                  t={t}
                  categories={categories}
                  onRecategorize={onRecategorize}
                  onToggleExcluded={onToggleExcluded}
                  merchantInfo={merchantInfo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
