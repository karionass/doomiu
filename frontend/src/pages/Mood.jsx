import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import CatFace, { MOODS } from '../components/CatFace';
import { dateKey, monthName, weekdayShort, prettyDate, parseKey } from '../utils';

const TAGS = ['work', 'study', 'sleep', 'relations', 'family', 'friends', 'health', 'sport'];
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Пн … Вс
const blank = { level: 0, tags: [], note: '' };

export default function Mood() {
  const { moods, saveMood, removeMood, t, locale, tagName } = useApp();
  const todayKey = dateKey();
  const [selected, setSelected] = useState(todayKey);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [draft, setDraft] = useState(blank);
  const [saved, setSaved] = useState(false);

  // при смене дня подгружаем сохранённую запись
  useEffect(() => {
    setDraft(moods[selected] ? { ...blank, ...moods[selected] } : blank);
    setSaved(false);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTag = (k) =>
    setDraft((d) => ({ ...d, tags: d.tags.includes(k) ? d.tags.filter((x) => x !== k) : [...d.tags, k] }));

  const save = () => {
    if (!draft.level) return;
    saveMood(selected, draft);
    setSaved(true);
  };

  const removeEntry = () => {
    removeMood(selected);
    setDraft(blank);
  };

  // календарь
  const first = new Date(cursor.y, cursor.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const shift = (n) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const isToday = selected === todayKey;

  return (
    <>
      <h1>{t('mood.title')}</h1>
      <p className="muted cap">{isToday ? t('mood.today') : prettyDate(parseKey(selected), locale)}</p>

      <div className="card">
        <div className="cats">
          {MOODS.map((m) => (
            <button
              key={m.level}
              className={`cat-btn ${draft.level === m.level ? 'on' : ''}`}
              onClick={() => {
                setDraft({ ...draft, level: m.level });
                setSaved(false);
              }}
              title={t(`mood.${m.level}`)}
            >
              <CatFace level={m.level} size={74} label={t(`mood.${m.level}`)} />
              <span>{t(`mood.${m.level}`)}</span>
            </button>
          ))}
        </div>

        {draft.level > 0 && <p className="center muted">{t('mood.selected', { label: t(`mood.${draft.level}`) })}</p>}

        <span className="label-text">{t('mood.influence')}</span>
        <div className="chips">
          {TAGS.map((k) => (
            <button key={k} className={`chip ${draft.tags.includes(k) ? 'on' : ''}`} onClick={() => toggleTag(k)}>
              {tagName(k)}
            </button>
          ))}
        </div>

        <label className="form" style={{ marginTop: 16 }}>
          {t('mood.note')}
          <textarea
            rows="4"
            placeholder={t('mood.notePh')}
            value={draft.note}
            onChange={(e) => {
              setDraft({ ...draft, note: e.target.value });
              setSaved(false);
            }}
          />
        </label>

        <div className="row" style={{ marginTop: 14 }}>
          <button onClick={save} disabled={!draft.level}>
            {t('common.save')}
          </button>
          {moods[selected] && (
            <button className="soft" onClick={removeEntry}>
              {t('mood.deleteEntry')}
            </button>
          )}
          {saved && <span className="success-text">{t('common.saved')}</span>}
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <button className="soft" onClick={() => shift(-1)}>
            ←
          </button>
          <strong className="cap">
            {monthName(cursor.m, locale)} {cursor.y}
          </strong>
          <button className="soft" onClick={() => shift(1)}>
            →
          </button>
        </div>

        <div className="calendar">
          {WEEK.map((w) => (
            <div key={w} className="cal-head">
              {weekdayShort(w, locale)}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const k = dateKey(new Date(cursor.y, cursor.m, day));
            const entry = moods[k];
            const future = k > todayKey;
            return (
              <button
                key={k}
                disabled={future}
                className={`cal-day ${selected === k ? 'sel' : ''} ${k === todayKey ? 'today' : ''}`}
                onClick={() => setSelected(k)}
              >
                <span className="cal-num">{day}</span>
                {entry ? <CatFace level={entry.level} size={30} label={t(`mood.${entry.level}`)} /> : <span className="cal-empty" />}
              </button>
            );
          })}
        </div>
        <p className="muted small center">{t('mood.hint')}</p>
      </div>
    </>
  );
}
