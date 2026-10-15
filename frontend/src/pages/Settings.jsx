import { useState } from 'react';
import { useApp } from '../AppContext';
import { LANGS } from '../i18n';

const zones = () => {
  const cur = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return all.includes(cur) ? all : [cur, ...all];
};

export default function Settings() {
  const { settings, updateSettings, resetAll, loadDemo, logout, user, demoMode, t } = useApp();
  const [perm, setPerm] = useState('Notification' in window ? Notification.permission : 'unsupported');
  const [name, setName] = useState(settings.name || user?.name || '');

  const askPermission = async () => {
    if (!('Notification' in window)) return;
    setPerm(await Notification.requestPermission());
  };

  return (
    <>
      <h1>{t('set.title')}</h1>

      <div className="card form">
        <h3>{t('set.profile')}</h3>
        <label>
          {t('set.name')}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== settings.name && updateSettings({ name: name.trim() })}
            placeholder={t('set.namePh')}
          />
        </label>
        <label>
          {t('set.lang')}
          <select value={settings.lang} onChange={(e) => updateSettings({ lang: e.target.value })}>
            {LANGS.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('set.tz')}
          <select value={settings.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })}>
            {zones().map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <h3>{t('set.theme')}</h3>
        <div className="chips">
          <button className={`chip ${settings.theme === 'light' ? 'on' : ''}`} onClick={() => updateSettings({ theme: 'light' })}>
            {t('set.light')}
          </button>
          <button className={`chip ${settings.theme === 'dark' ? 'on' : ''}`} onClick={() => updateSettings({ theme: 'dark' })}>
            {t('set.dark')}
          </button>
        </div>
      </div>

      <div className="card form">
        <h3>{t('set.remind')}</h3>
        <label className="row">
          <input
            type="checkbox"
            className="check"
            checked={settings.remind}
            onChange={(e) => updateSettings({ remind: e.target.checked })}
          />
          {t('set.remindOn')}
        </label>
        {perm === 'unsupported' && <p className="muted small">{t('set.unsupported')}</p>}
        {perm === 'default' && (
          <button className="soft" onClick={askPermission}>
            {t('set.allow')}
          </button>
        )}
        {perm === 'granted' && <p className="success-text">{t('set.granted')}</p>}
        {perm === 'denied' && <p className="muted small">{t('set.denied')}</p>}
        <p className="muted small">{t('set.remindHint')}</p>
      </div>

      <div className="card">
        <h3>{t('set.data')}</h3>
        <p className="muted small">{demoMode ? t('set.dataLocal') : t('set.dataServer')}</p>
        {demoMode && (
          <div className="row">
            <button className="soft" onClick={loadDemo}>
              {t('set.demo')}
            </button>
            <button
              className="soft"
              onClick={() => {
                if (window.confirm(t('set.clearConfirm'))) resetAll();
              }}
            >
              {t('set.clear')}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t('set.account')}</h3>
        {user?.email && <p className="muted small">{user.email}</p>}
        <button className="soft" onClick={logout}>
          {t('set.logout')}
        </button>
      </div>
    </>
  );
}
