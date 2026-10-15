import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { dateKey } from '../utils';

// ---------- дыхание ----------
const PATTERN_478 = [
  { key: 'inhale', sec: 4, scale: 1.35 },
  { key: 'hold', sec: 7, scale: 1.35 },
  { key: 'exhale', sec: 8, scale: 0.8 },
];
const PATTERN_BOX = [
  { key: 'inhale', sec: 4, scale: 1.35 },
  { key: 'hold', sec: 4, scale: 1.35 },
  { key: 'exhale', sec: 4, scale: 0.8 },
  { key: 'pause', sec: 4, scale: 0.8 },
];

function Breathing({ pattern }) {
  const { t } = useApp();
  const [run, setRun] = useState(false);
  const [s, setS] = useState({ i: 0, left: pattern[0].sec, cycles: 0 });

  useEffect(() => {
    setRun(false);
    setS({ i: 0, left: pattern[0].sec, cycles: 0 });
  }, [pattern]);

  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      setS((st) => {
        if (st.left > 1) return { ...st, left: st.left - 1 };
        const ni = (st.i + 1) % pattern.length;
        return { i: ni, left: pattern[ni].sec, cycles: st.cycles + (ni === 0 ? 1 : 0) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [run, pattern]);

  const phase = pattern[s.i];
  const reset = () => {
    setRun(false);
    setS({ i: 0, left: pattern[0].sec, cycles: 0 });
  };

  return (
    <div className="center">
      <div className="breath-stage">
        <div
          className="breath-circle"
          style={{ transform: `scale(${run ? phase.scale : 1})`, transitionDuration: `${run ? phase.sec : 0.6}s` }}
        >
          <strong>{run ? t(`ex.${phase.key}`) : t('ex.ready')}</strong>
          {run && <span>{s.left}</span>}
        </div>
      </div>
      <p className="muted">{t('ex.cycles', { n: s.cycles })}</p>
      <div className="row center-row">
        <button onClick={() => setRun((v) => !v)}>{run ? t('common.pause') : t('common.start')}</button>
        <button className="soft" onClick={reset}>
          {t('ex.restart')}
        </button>
      </div>
    </div>
  );
}

// ---------- таймер (медитация, pomodoro) ----------
function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.frequency.value = 528;
    g.gain.value = 0.1;
    o.start();
    o.stop(c.currentTime + 0.7);
  } catch {
    /* звук не критичен */
  }
}

function Countdown({ modes }) {
  const { t } = useApp();
  const [mode, setMode] = useState(0);
  const [left, setLeft] = useState(modes[0].min * 60);
  const [run, setRun] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setMode(0);
    setLeft(modes[0].min * 60);
    setRun(false);
    setFinished(false);
  }, [modes]);

  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRun(false);
          setFinished(true);
          beep();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [run]);

  const pick = (i) => {
    setMode(i);
    setLeft(modes[i].min * 60);
    setRun(false);
    setFinished(false);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const total = modes[mode].min * 60;

  return (
    <div className="center">
      <div className="chips center-row">
        {modes.map((m, i) => (
          <button key={m.kind + m.min} className={`chip ${mode === i ? 'on' : ''}`} onClick={() => pick(i)}>
            {t(`ex.${m.kind}`, { n: m.min })}
          </button>
        ))}
      </div>
      <div className="timer">
        {mm}:{ss}
      </div>
      <div className="progress" style={{ maxWidth: 320, margin: '0 auto 16px' }}>
        <div className="progress-bar" style={{ width: `${((total - left) / total) * 100}%` }} />
      </div>
      {finished && <p className="success-text">{t('ex.finished')}</p>}
      <div className="row center-row">
        <button onClick={() => setRun((v) => !v)}>{run ? t('common.pause') : t('common.start')}</button>
        <button className="soft" onClick={() => pick(mode)}>
          {t('common.reset')}
        </button>
      </div>
    </div>
  );
}

// ---------- дневник благодарности ----------
function Gratitude() {
  const { gratitude, saveGratitude, t } = useApp();
  const today = dateKey();
  const pad = (a = []) => [...a, '', '', ''].slice(0, 3);
  const [items, setItems] = useState(() => pad(gratitude[today]));
  const [saved, setSaved] = useState(false);

  const save = () => {
    saveGratitude(today, items);
    setSaved(true);
  };

  const past = Object.keys(gratitude)
    .filter((k) => k !== today)
    .sort()
    .reverse()
    .slice(0, 5);

  return (
    <div className="form">
      <p className="muted">{t('ex.grat.prompt')}</p>
      {items.map((v, i) => (
        <input
          key={i}
          value={v}
          placeholder={t('ex.grat.ph', { n: i + 1 })}
          onChange={(e) => {
            const copy = [...items];
            copy[i] = e.target.value;
            setItems(copy);
            setSaved(false);
          }}
        />
      ))}
      <div className="row">
        <button onClick={save}>{t('common.save')}</button>
        {saved && <span className="success-text">{t('common.saved')}</span>}
      </div>
      {past.length > 0 && (
        <>
          <h4>{t('ex.grat.past')}</h4>
          {past.map((k) => (
            <div key={k} className="card soft-card">
              <strong className="small">{k}</strong>
              <ul>
                {gratitude[k].filter(Boolean).map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ---------- библиотека ----------
const MEDITATION = [5, 10, 15].map((min) => ({ kind: 'min', min }));
const POMODORO = [
  { kind: 'focus', min: 25 },
  { kind: 'break', min: 5 },
  { kind: 'long', min: 15 },
];

const LIBRARY = [
  { id: 'b478', icon: '🌬️' },
  { id: 'box', icon: '⬜' },
  { id: 'med', icon: '🧘' },
  { id: 'pomo', icon: '🍅' },
  { id: 'grat', icon: '📝' },
];

export default function Exercises() {
  const { t } = useApp();
  const [open, setOpen] = useState('b478');
  const current = LIBRARY.find((x) => x.id === open);

  return (
    <>
      <h1>{t('ex.title')}</h1>
      <p className="muted">{t('ex.sub')}</p>

      <div className="lib">
        {LIBRARY.map((x) => (
          <button key={x.id} className={`lib-card ${open === x.id ? 'on' : ''}`} onClick={() => setOpen(x.id)}>
            <span className="lib-icon">{x.icon}</span>
            <strong>{t(`ex.${x.id}.title`)}</strong>
            <span className="muted small">{t(`ex.${x.id}.text`)}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <h3>
          {current.icon} {t(`ex.${current.id}.title`)}
        </h3>
        <p className="muted small">{t(`ex.${current.id}.hint`)}</p>
        {open === 'b478' && <Breathing pattern={PATTERN_478} />}
        {open === 'box' && <Breathing pattern={PATTERN_BOX} />}
        {open === 'med' && <Countdown modes={MEDITATION} />}
        {open === 'pomo' && <Countdown modes={POMODORO} />}
        {open === 'grat' && <Gratitude />}
      </div>
    </>
  );
}
