import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocal, seedHabits, seedMoods, dateKey, isDue } from './utils';
import { makeT, detectLang, LOCALES } from './i18n';
import { API_ENABLED, api, send, flush, tokens, clearQueue, setAuthLostHandler, fromApiHabit } from './api';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Almaty';
const defaults = () => ({ name: '', theme: 'light', lang: detectLang(), timezone: tz(), remind: false });

export function AppProvider({ children }) {
  const [user, setUser] = useLocal('mindful.user', null);
  const [habits, setHabits] = useLocal('mindful.habits', []);
  const [moods, setMoods] = useLocal('mindful.moods', {});
  const [gratitude, setGratitude] = useLocal('mindful.gratitude', {});
  const [stored, setStored] = useLocal('mindful.settings', {});
  const [online, setOnline] = useState(navigator.onLine);
  const fired = useRef({});

  const settings = useMemo(() => ({ ...defaults(), ...stored }), [stored]);
  const t = useMemo(() => makeT(settings.lang), [settings.lang]);
  const locale = LOCALES[settings.lang];

  // категории и теги хранятся ключами (health, sleep…), а показываются переводом
  const label = (prefix) => (k) => {
    const v = t(`${prefix}.${k}`);
    return v === `${prefix}.${k}` ? k : v; // старые записи с русскими словами показываем как есть
  };
  const catName = label('cat');
  const tagName = label('tag');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.lang = settings.lang;
  }, [settings.theme, settings.lang]);

  // ---------- синхронизация с сервером ----------
  const sync = useCallback(async () => {
    if (!API_ENABLED || !tokens.get()) return;
    try {
      await flush();
      const [me, hs, ms, gs] = await Promise.all([api.me(), api.habits(), api.mood(), api.gratitude()]);
      setUser({ email: me.email, name: me.name });
      setStored((s) => ({
        ...s,
        name: me.name || '',
        timezone: me.timezone || s.timezone,
        lang: me.language || s.lang,
        theme: me.theme || s.theme,
      }));
      setHabits(hs.map(fromApiHabit));
      setMoods(Object.fromEntries(ms.map((m) => [m.date, { level: m.level, tags: m.tags || [], note: m.note || '' }])));
      setGratitude(Object.fromEntries(gs.map((g) => [g.date, g.items || []])));
    } catch {
      /* нет сети — работаем с тем, что сохранено в браузере */
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (API_ENABLED && user && !tokens.get()) setUser(null); // токена нет — значит, нужно войти заново
    else if (user) sync();
    const on = () => {
      setOnline(true);
      sync();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- вход / выход ----------
  const logout = () => {
    if (API_ENABLED) {
      tokens.clear();
      clearQueue();
      setHabits([]);
      setMoods({});
      setGratitude({});
    }
    setUser(null);
  };
  useEffect(() => setAuthLostHandler(logout), []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    if (!API_ENABLED) return setUser({ email, name: settings.name || email.split('@')[0] });
    await api.login(email, password);
    const me = await api.me();
    setUser({ email: me.email, name: me.name });
    sync();
  };

  const register = async (name, email, password) => {
    if (!API_ENABLED) {
      setStored((s) => ({ ...s, name }));
      return setUser({ email, name });
    }
    await api.register(name, email, password);
    await login(email, password);
  };

  // ---------- привычки ----------
  const write = (method, path, body) => send(method, path, body).catch((e) => console.warn('sync failed', e));

  const addHabit = async (h) => {
    if (!API_ENABLED) {
      setHabits((hs) => [{ ...h, id: Date.now(), archived: false, createdAt: dateKey(), log: {} }, ...hs]);
      return;
    }
    const created = await api.createHabit(h); // создание привычки требует связи с сервером
    setHabits((hs) => [fromApiHabit(created), ...hs]);
  };

  const patchHabit = (id, patch) => setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  const setArchived = (id, archived) => {
    patchHabit(id, { archived });
    if (API_ENABLED) write('PATCH', `/habits/${id}/`, { archived });
  };

  const removeHabit = (id) => {
    setHabits((hs) => hs.filter((h) => h.id !== id));
    if (API_ENABLED) write('DELETE', `/habits/${id}/`);
  };

  const toggleHabit = (id, date = dateKey()) => {
    const h = habits.find((x) => x.id === id);
    if (!h) return;
    const done = !h.log[date];
    patchHabit(id, { log: { ...h.log, [date]: done } });
    if (API_ENABLED) write('POST', `/habits/${id}/check/`, { date, done });
  };

  // ---------- настроение и благодарность ----------
  const saveMood = (date, entry) => {
    setMoods((m) => ({ ...m, [date]: entry }));
    if (API_ENABLED) write('PUT', `/mood/${date}/`, { level: entry.level, tags: entry.tags, note: entry.note });
  };
  const removeMood = (date) => {
    setMoods((m) => {
      const copy = { ...m };
      delete copy[date];
      return copy;
    });
    if (API_ENABLED) write('DELETE', `/mood/${date}/`);
  };
  const saveGratitude = (date, items) => {
    setGratitude((g) => ({ ...g, [date]: items }));
    if (API_ENABLED) write('PUT', `/gratitude/${date}/`, { items });
  };

  // ---------- настройки ----------
  const updateSettings = (patch) => {
    setStored((s) => ({ ...s, ...patch }));
    if (!API_ENABLED || !user) return;
    const body = {};
    if ('name' in patch) body.name = patch.name;
    if ('timezone' in patch) body.timezone = patch.timezone;
    if ('lang' in patch) body.language = patch.lang;
    if ('theme' in patch) body.theme = patch.theme;
    if (Object.keys(body).length) write('PATCH', '/auth/me/', body);
  };

  const resetAll = () => {
    setHabits([]);
    setMoods({});
    setGratitude({});
  };
  const loadDemo = () => {
    setHabits(seedHabits());
    setMoods(seedMoods());
  };

  // ---------- напоминания (работают, пока вкладка открыта) ----------
  useEffect(() => {
    if (!settings.remind) return;
    const id = setInterval(() => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = dateKey(now);
      habits.forEach((h) => {
        const k = `${h.id}-${today}`;
        if (h.archived || h.reminder !== hhmm || h.log[today] || fired.current[k] || !isDue(h, now)) return;
        fired.current[k] = true;
        new Notification(t('notif.title'), { body: t('notif.body', { name: h.name }), icon: '/icons/icon-192.png' });
      });
    }, 20000);
    return () => clearInterval(id);
  }, [settings.remind, habits, t]);

  return (
    <Ctx.Provider
      value={{
        user, login, register, logout, online,
        habits, addHabit, setArchived, removeHabit, toggleHabit,
        moods, saveMood, removeMood,
        gratitude, saveGratitude,
        settings, updateSettings, resetAll, loadDemo,
        t, locale, catName, tagName,
        demoMode: !API_ENABLED,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
