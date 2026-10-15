import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { LANGS } from '../i18n';

export default function Auth({ mode }) {
  const { user, login, register, t, settings, updateSettings, demoMode } = useApp();
  const isReg = mode === 'register';
  const [f, setF] = useState({ name: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // переводим ответ сервера в понятное сообщение
  const message = (e) => {
    if (e.status === 0) return t('auth.errNet');
    if (e.status === 401) return t('auth.errCreds');
    if (e.status === 400 && e.data) {
      if (e.data.email) return t('auth.errExists');
      const first = Object.values(e.data).flat()[0];
      if (typeof first === 'string') return first;
    }
    return t('auth.errGeneric');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (isReg && f.password.length < 8) return setError(t('auth.errShort'));
    if (isReg && f.password !== f.password2) return setError(t('auth.errMismatch'));
    setBusy(true);
    try {
      if (isReg) await register(f.name.trim(), f.email.trim(), f.password);
      else await login(f.email.trim(), f.password);
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card form auth-card" onSubmit={submit}>
        <div className="logo center">
          <span>🌸</span> Mindful
        </div>
        <p className="muted center small">{t('auth.tagline')}</p>
        <h2 className="center">{isReg ? t('auth.register') : t('auth.login')}</h2>

        {demoMode && <p className="muted small demo-note">{t('auth.demo')}</p>}

        {isReg && (
          <label>
            {t('auth.name')}
            <input value={f.name} onChange={set('name')} required autoComplete="name" />
          </label>
        )}
        <label>
          {t('auth.email')}
          <input type="email" value={f.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label>
          {t('auth.password')}
          <input
            type="password"
            value={f.password}
            onChange={set('password')}
            required
            autoComplete={isReg ? 'new-password' : 'current-password'}
          />
        </label>
        {isReg && (
          <label>
            {t('auth.password2')}
            <input type="password" value={f.password2} onChange={set('password2')} required autoComplete="new-password" />
          </label>
        )}

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? t('auth.wait') : isReg ? t('auth.signup') : t('auth.signin')}
        </button>

        <p className="center small muted">
          {isReg ? t('auth.hasAcc') : t('auth.noAcc')}{' '}
          <Link to={isReg ? '/login' : '/register'}>{isReg ? t('auth.login') : t('auth.register')}</Link>
        </p>

        <select className="lang-select" value={settings.lang} onChange={(e) => updateSettings({ lang: e.target.value })} aria-label="Language">
          {LANGS.map(([k, name]) => (
            <option key={k} value={k}>
              {name}
            </option>
          ))}
        </select>
      </form>
    </div>
  );
}
