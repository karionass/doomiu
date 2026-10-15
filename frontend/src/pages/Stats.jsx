import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useApp } from '../AppContext';
import { dateKey, addDays, weekdayShort, isDue } from '../utils';

const tick = { fill: 'var(--muted)', fontSize: 12 };

export default function Stats() {
  const { habits, moods, t, locale, tagName } = useApp();
  const [range, setRange] = useState('week');
  const active = habits.filter((h) => !h.archived);

  const dayPercent = (d) => {
    const due = active.filter((h) => isDue(h, d));
    if (!due.length) return 0;
    const done = due.filter((h) => h.log[dateKey(d)]).length;
    return Math.round((done / due.length) * 100);
  };

  const habitData = useMemo(() => {
    const n = range === 'week' ? 7 : 30;
    const today = new Date();
    return Array.from({ length: n }, (_, i) => {
      const d = addDays(today, -(n - 1 - i));
      return {
        name: range === 'week' ? weekdayShort(d.getDay(), locale) : `${d.getDate()}.${d.getMonth() + 1}`,
        value: dayPercent(d),
      };
    });
  }, [range, habits, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const moodData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = addDays(today, -(29 - i));
      const e = moods[dateKey(d)];
      return { name: `${d.getDate()}.${d.getMonth() + 1}`, level: e ? e.level : null };
    });
  }, [moods]);

  const avgMood = (() => {
    const vals = moodData.filter((x) => x.level).map((x) => x.level);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  })();

  // тепловая карта: 20 недель
  const heat = useMemo(() => {
    const today = new Date();
    const monday = addDays(today, -((today.getDay() + 6) % 7) - 19 * 7);
    const weeks = [];
    for (let w = 0; w < 20; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(monday, w * 7 + d);
        if (date > today) {
          col.push(null);
          continue;
        }
        const due = active.filter((h) => isDue(h, date));
        const done = due.filter((h) => h.log[dateKey(date)]).length;
        const ratio = due.length ? done / due.length : 0;
        const lvl = done === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : ratio < 1 ? 3 : 4;
        col.push({ key: dateKey(date), lvl, done, total: due.length });
      }
      weeks.push(col);
    }
    return weeks;
  }, [habits]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = (name, text, type) => {
    const blob = new Blob(['﻿' + text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const dates = new Set([...Object.keys(moods), ...habits.flatMap((h) => Object.keys(h.log))]);
    const sorted = [...dates].sort();
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const header = [t('stats.csvDate'), t('stats.csvMood'), t('stats.csvTags'), t('stats.csvNote'), ...habits.map((h) => h.name)];
    const rows = sorted.map((d) => [
      d,
      moods[d]?.level ?? '',
      (moods[d]?.tags || []).map(tagName).join('; '),
      moods[d]?.note ?? '',
      ...habits.map((h) => (h.log[d] ? 1 : 0)),
    ]);
    const csv = [header, ...rows].map((r) => r.map(q).join(',')).join('\n');
    download('mindful-export.csv', csv, 'text/csv;charset=utf-8');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('stats.title')}</h1>
          <p className="muted">{t('stats.sub')}</p>
        </div>
        <div className="row no-print">
          <button className="soft" onClick={exportCsv}>
            {t('stats.csv')}
          </button>
          <button className="soft" onClick={() => window.print()}>
            {t('stats.pdf')}
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card stat">
          <span className="muted small">{t('stats.active')}</span>
          <strong className="big">{active.length}</strong>
        </div>
        <div className="card stat">
          <span className="muted small">{t('stats.avg')}</span>
          <strong className="big">{avgMood}</strong>
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <strong>{t('stats.habitsPct')}</strong>
          <div className="chips">
            <button className={`chip ${range === 'week' ? 'on' : ''}`} onClick={() => setRange('week')}>
              {t('stats.week')}
            </button>
            <button className={`chip ${range === 'month' ? 'on' : ''}`} onClick={() => setRange('month')}>
              {t('stats.month')}
            </button>
          </div>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={habitData}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} interval={range === 'month' ? 4 : 0} />
              <YAxis domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} width={34} />
              <Tooltip
                formatter={(v) => [`${v}%`, t('stats.done')]}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow)' }}
              />
              <Bar dataKey="value" fill="#9B8FD9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <strong>{t('stats.moodTitle')}</strong>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={moodData}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} interval={4} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={tick} tickLine={false} axisLine={false} width={24} />
              <Tooltip
                formatter={(v) => [v, t('stats.mood')]}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow)' }}
              />
              <Line type="monotone" dataKey="level" stroke="#6CC3A3" strokeWidth={3} dot={{ r: 3, fill: '#6CC3A3' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <strong>{t('stats.heat')}</strong>
        <div className="heat-wrap">
          <div className="heat">
            {heat.map((col, i) => (
              <div key={i} className="heat-col">
                {col.map((c, j) =>
                  c ? (
                    <div
                      key={j}
                      className={`heat-cell l${c.lvl}`}
                      title={`${c.key}: ${c.done}/${c.total}`}
                    />
                  ) : (
                    <div key={j} className="heat-cell none" />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="legend">
          <span className="muted small">{t('stats.less')}</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className={`heat-cell l${l}`} />
          ))}
          <span className="muted small">{t('stats.more')}</span>
        </div>
      </div>
    </>
  );
}
