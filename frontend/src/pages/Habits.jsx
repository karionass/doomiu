import { useState } from 'react';
import { useApp } from '../AppContext';
import { dateKey, streak, streakUnit, weekCount, isScheduled, isDue, prettyDate, weekdayShort } from '../utils';

const ICONS = ['💧', '📚', '🧘', '🏃', '🥗', '😴', '✍️', '🎧', '🌿', '🧹', '💊', '🚶'];
const CATS = ['health', 'study', 'work', 'rest', 'home', 'other'];
const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Пн … Вс

const emptyForm = { name: '', icon: '💧', category: 'health', freq: 'daily', days: [1, 2, 3, 4, 5], times: 3, reminder: '' };

export default function Habits() {
  const { habits, addHabit, setArchived, removeHabit, toggleHabit, t, locale, catName } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const today = dateKey();
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const todays = active.filter((h) => isDue(h));
  const doneCount = todays.filter((h) => h.log[today]).length;
  const percent = todays.length ? Math.round((doneCount / todays.length) * 100) : 0;
  const motivation = t('motivation')[new Date().getDate() % 7];

  const remove = (id) => {
    if (window.confirm(t('habits.deleteConfirm'))) removeHabit(id);
  };

  const toggleDay = (d) =>
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError('');
    try {
      await addHabit({
        icon: form.icon,
        name: form.name.trim(),
        category: form.category,
        freq: form.freq,
        days: form.freq === 'days' ? form.days : [],
        times: Math.min(7, Math.max(1, Number(form.times) || 1)),
        reminder: form.reminder,
      });
      setForm(emptyForm);
      setShowForm(false);
    } catch {
      setError(t('habits.error'));
    }
  };

  const freqText = (h) => {
    if (h.freq === 'daily') return t('habits.everyDay');
    if (h.freq === 'times') return t('habits.weekProgress', { a: weekCount(h), b: h.times });
    return DAYS.filter((d) => h.days.includes(d)).map((d) => weekdayShort(d, locale)).join(', ');
  };

  const streakText = (h) => t(streakUnit(h) === 'weeks' ? 'habits.streakWeeks' : 'habits.streakDays', { n: streak(h) });

  const offText = (h) => (h.freq === 'times' ? t('habits.weekDone') : t('habits.offDay'));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('habits.title')}</h1>
          <p className="muted cap">{prettyDate(new Date(), locale)}</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? t('habits.close') : t('habits.new')}</button>
      </div>

      <div className="card motivation">{motivation}</div>

      {todays.length > 0 && (
        <div className="card">
          <div className="row between">
            <strong>{t('habits.todayDone')}</strong>
            <span className="muted">{t('habits.of', { a: doneCount, b: todays.length })}</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${percent}%` }} />
          </div>
          {percent === 100 && <p className="success-text">{t('habits.allDone')}</p>}
        </div>
      )}

      {showForm && (
        <form className="card form" onSubmit={submit}>
          <h3>{t('habits.formTitle')}</h3>
          <label>
            {t('habits.name')}
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('habits.namePh')}
            />
          </label>

          <div>
            <span className="label-text">{t('habits.icon')}</span>
            <div className="chips">
              {ICONS.map((i) => (
                <button
                  type="button"
                  key={i}
                  className={`chip icon-chip ${form.icon === i ? 'on' : ''}`}
                  onClick={() => setForm({ ...form, icon: i })}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <label>
            {t('habits.category')}
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {catName(c)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t('habits.freq')}
            <select value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value })}>
              <option value="daily">{t('habits.daily')}</option>
              <option value="days">{t('habits.days')}</option>
              <option value="times">{t('habits.times')}</option>
            </select>
          </label>

          {form.freq === 'days' && (
            <div className="chips">
              {DAYS.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`chip ${form.days.includes(d) ? 'on' : ''}`}
                  onClick={() => toggleDay(d)}
                >
                  {weekdayShort(d, locale)}
                </button>
              ))}
            </div>
          )}

          {form.freq === 'times' && (
            <label>
              {t('habits.timesLabel')}
              <input
                type="number"
                min="1"
                max="7"
                value={form.times}
                onChange={(e) => setForm({ ...form, times: e.target.value })}
              />
            </label>
          )}

          <label>
            {t('habits.reminder')}
            <input type="time" value={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.value })} />
          </label>

          {error && <p className="error-text">{error}</p>}
          <button type="submit">{t('habits.add')}</button>
        </form>
      )}

      {active.length === 0 && <div className="card muted center">{t('habits.empty')}</div>}

      {active.map((h) => {
        const due = isDue(h);
        const done = !!h.log[today];
        return (
          <div key={h.id} className={`card habit ${done ? 'done' : ''} ${due ? '' : 'off'}`}>
            <span className="habit-icon">{h.icon}</span>
            <div className="habit-body">
              <strong>{h.name}</strong>
              <div className="muted small">
                {catName(h.category)} · {freqText(h)}
                {h.reminder && ` · ⏰ ${h.reminder}`}
              </div>
              <div className="small">
                {streakText(h)}
                {!due && ` · ${offText(h)}`}
              </div>
            </div>
            <div className="habit-actions">
              <button className="ghost" title={t('habits.archive')} onClick={() => setArchived(h.id, true)}>
                📦
              </button>
              <button className="ghost" title={t('habits.delete')} onClick={() => remove(h.id)}>
                🗑️
              </button>
              <input
                className="check"
                type="checkbox"
                checked={done}
                disabled={!due && !isScheduled(h)}
                onChange={() => toggleHabit(h.id)}
                aria-label={t('habits.check', { name: h.name })}
              />
            </div>
          </div>
        );
      })}

      {archived.length > 0 && (
        <>
          <button className="ghost link" onClick={() => setShowArchive((v) => !v)}>
            {showArchive ? t('habits.hideArchive') : t('habits.archiveTitle', { n: archived.length })}
          </button>
          {showArchive &&
            archived.map((h) => (
              <div key={h.id} className="card habit off">
                <span className="habit-icon">{h.icon}</span>
                <div className="habit-body">
                  <strong>{h.name}</strong>
                </div>
                <button className="soft" onClick={() => setArchived(h.id, false)}>
                  {t('habits.restore')}
                </button>
                <button className="ghost" title={t('habits.delete')} onClick={() => remove(h.id)}>
                  🗑️
                </button>
              </div>
            ))}
        </>
      )}
    </>
  );
}
