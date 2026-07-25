import { useState, useEffect } from 'react';
import { todayStr, daysBetween, addMonths } from '../lib/storage';
import { useSupabaseState } from '../lib/supabaseState';
import { useAuth } from '../lib/AuthContext';
import { savePhoto, getPhotoURL } from '../lib/photoStore';

const DEFAULT_STATE = {
  fillups: [], // { id, date, mileage, photoId }
  oilChanges: [], // { id, date, mileage, nextDueMileage, nextDueDate, photoId }
};

const OIL_MILEAGE_INTERVAL = 5000;
const OIL_MONTHS_INTERVAL = 6;
const DUE_SOON_MILES = 500;
const DUE_SOON_DAYS = 14;
const GAS_STATION_RADIUS_M = 250;

export function useCarState() {
  return useSupabaseState('car', DEFAULT_STATE);
}

export function latestMileage(state) {
  const all = [...state.fillups, ...state.oilChanges];
  if (all.length === 0) return null;
  return Math.max(...all.map((e) => Number(e.mileage) || 0));
}

export function oilStatus(state) {
  if (state.oilChanges.length === 0) {
    return { level: 'no-data', text: 'No oil changes logged yet' };
  }
  const last = [...state.oilChanges].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const mileage = latestMileage(state);
  const milesUntilDue = mileage != null && last.nextDueMileage ? last.nextDueMileage - mileage : null;
  const daysUntilDue = last.nextDueDate ? daysBetween(todayStr(), last.nextDueDate) : null;

  const overdue = (milesUntilDue != null && milesUntilDue <= 0) || (daysUntilDue != null && daysUntilDue <= 0);
  const dueSoon = (milesUntilDue != null && milesUntilDue <= DUE_SOON_MILES) || (daysUntilDue != null && daysUntilDue <= DUE_SOON_DAYS);

  if (overdue) return { level: 'overdue', text: 'Oil change overdue', milesUntilDue, daysUntilDue };
  if (dueSoon) return { level: 'due-soon', text: 'Oil change due soon', milesUntilDue, daysUntilDue };
  return { level: 'ok', text: 'Oil change on track', milesUntilDue, daysUntilDue };
}

function PhotoThumb({ photoId }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getPhotoURL(photoId).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [photoId]);
  return url ? <img className="car-thumb" src={url} alt="" /> : <div className="car-thumb" />;
}

function GasStationCheck() {
  const [status, setStatus] = useState('idle'); // idle | checking | found | not-found | error
  const [errorMsg, setErrorMsg] = useState('');

  async function check() {
    setStatus('checking');
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = position.coords;
      const query = `[out:json][timeout:10];node["amenity"="fuel"](around:${GAS_STATION_RADIUS_M},${latitude},${longitude});out body 5;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
      if (!res.ok) throw new Error('lookup failed');
      const data = await res.json();
      setStatus((data.elements || []).length > 0 ? 'found' : 'not-found');
    } catch (err) {
      setErrorMsg(err.code === 1 ? 'Location permission denied' : 'Could not check right now');
      setStatus('error');
    }
  }

  if (status === 'found') {
    return (
      <div className="gas-station-banner">
        Looks like you're at a gas station — log your mileage while you're here.
      </div>
    );
  }

  return (
    <div className="car-actions">
      <button className="secondary-btn" type="button" onClick={check} disabled={status === 'checking'}>
        {status === 'checking' ? 'Checking…' : 'Am I at a gas station?'}
      </button>
      {status === 'not-found' && <span className="module-note">No gas station detected nearby.</span>}
      {status === 'error' && <span className="module-note">{errorMsg}</span>}
    </div>
  );
}

function LogForm({ kind, defaults, onCancel, onSave }) {
  const { user } = useAuth();
  const [mileage, setMileage] = useState(defaults.mileage ?? '');
  const [nextDueMileage, setNextDueMileage] = useState(defaults.nextDueMileage ?? '');
  const [nextDueDate, setNextDueDate] = useState(defaults.nextDueDate ?? '');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!mileage) return;
    setSaving(true);
    setError('');
    try {
      const photoId = file ? await savePhoto(file, user.id) : null;
      onSave({ mileage: Number(mileage), nextDueMileage: nextDueMileage ? Number(nextDueMileage) : null, nextDueDate: nextDueDate || null, photoId });
    } catch (err) {
      setError('Could not upload photo — try again.');
      console.error(err);
    }
    setSaving(false);
  }

  return (
    <div className="car-log-form">
      <div className="car-log-form-row">
        <label>Photo of {kind === 'oil' ? 'the oil-change sticker' : 'your odometer'}</label>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files[0] || null)} />
      </div>
      <div className="car-log-form-row">
        <label>Current mileage</label>
        <input type="number" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="e.g. 48210" />
      </div>
      {kind === 'oil' && (
        <>
          <div className="car-log-form-row">
            <label>Next oil change due — mileage</label>
            <input type="number" inputMode="numeric" value={nextDueMileage} onChange={(e) => setNextDueMileage(e.target.value)} />
          </div>
          <div className="car-log-form-row">
            <label>Next oil change due — date</label>
            <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </div>
        </>
      )}
      {error && <p className="login-error">{error}</p>}
      <div className="car-actions">
        <button className="primary-btn" type="button" onClick={handleSave} disabled={saving || !mileage}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="secondary-btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function CarModule({ state, setState }) {
  const [openForm, setOpenForm] = useState(null); // null | 'fillup' | 'oil'
  const mileage = latestMileage(state);
  const status = oilStatus(state);
  const today = todayStr();

  function saveFillup(entry) {
    setState((prev) => ({ ...prev, fillups: [{ id: crypto.randomUUID(), date: today, ...entry }, ...prev.fillups] }));
    setOpenForm(null);
  }

  function saveOilChange(entry) {
    setState((prev) => ({ ...prev, oilChanges: [{ id: crypto.randomUUID(), date: today, ...entry }, ...prev.oilChanges] }));
    setOpenForm(null);
  }

  const oilDefaults = {
    mileage: mileage ?? '',
    nextDueMileage: mileage != null ? mileage + OIL_MILEAGE_INTERVAL : '',
    nextDueDate: addMonths(today, OIL_MONTHS_INTERVAL),
  };
  const fillupDefaults = { mileage: mileage ?? '' };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Car Maintenance</h2>
        <span className="pill">{mileage != null ? `${mileage.toLocaleString()} mi` : 'No mileage logged'}</span>
      </div>

      {status.level !== 'no-data' && (
        <div className={`car-status-banner ${status.level}`}>
          <span>
            {status.text}
            {status.milesUntilDue != null && ` · ${status.milesUntilDue > 0 ? `${status.milesUntilDue} mi left` : `${-status.milesUntilDue} mi over`}`}
            {status.daysUntilDue != null && ` · ${status.daysUntilDue > 0 ? `${status.daysUntilDue} days left` : `${-status.daysUntilDue} days over`}`}
          </span>
        </div>
      )}

      <GasStationCheck />

      <div className="car-actions">
        <button className="secondary-btn" type="button" onClick={() => setOpenForm(openForm === 'fillup' ? null : 'fillup')}>
          Log Fill-up
        </button>
        <button className="secondary-btn" type="button" onClick={() => setOpenForm(openForm === 'oil' ? null : 'oil')}>
          Log Oil Change
        </button>
      </div>

      {openForm === 'fillup' && (
        <LogForm kind="fillup" defaults={fillupDefaults} onCancel={() => setOpenForm(null)} onSave={saveFillup} />
      )}
      {openForm === 'oil' && (
        <LogForm kind="oil" defaults={oilDefaults} onCancel={() => setOpenForm(null)} onSave={saveOilChange} />
      )}

      {state.fillups.length > 0 && (
        <details className="tx-list">
          <summary>{state.fillups.length} fill-up{state.fillups.length === 1 ? '' : 's'} logged</summary>
          <div className="car-history">
            {state.fillups.map((f) => (
              <div className="car-history-item" key={f.id}>
                <PhotoThumb photoId={f.photoId} />
                <div className="car-history-detail">
                  <div className="car-history-title">{f.mileage.toLocaleString()} mi</div>
                  <div className="car-history-sub">{f.date}</div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {state.oilChanges.length > 0 && (
        <details className="tx-list">
          <summary>{state.oilChanges.length} oil change{state.oilChanges.length === 1 ? '' : 's'} logged</summary>
          <div className="car-history">
            {state.oilChanges.map((o) => (
              <div className="car-history-item" key={o.id}>
                <PhotoThumb photoId={o.photoId} />
                <div className="car-history-detail">
                  <div className="car-history-title">{o.mileage.toLocaleString()} mi</div>
                  <div className="car-history-sub">
                    {o.date}
                    {o.nextDueMileage ? ` · next by ${o.nextDueMileage.toLocaleString()} mi` : ''}
                    {o.nextDueDate ? ` or ${o.nextDueDate}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="module-note">
        "Am I at a gas station?" only works while this tab is open — a website can't reliably ping you in the background, especially on iPhone. For a real reminder even when your phone's locked, set up a location-triggered reminder in your phone's own Reminders/Shortcuts app pointed at this page — ask and I'll walk you through the exact steps for your phone.
      </p>
    </div>
  );
}
