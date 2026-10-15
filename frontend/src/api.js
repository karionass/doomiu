// Клиент для бэкенда (Django REST). Описание адресов и форматов — в API.md.
// Если VITE_API_URL не задан, приложение работает в демо-режиме (всё в localStorage).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_ENABLED = Boolean(BASE);

const TOKENS = 'mindful.tokens';
const QUEUE = 'mindful.queue';

const read = (k, def) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? def;
  } catch {
    return def;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ничего страшного */
  }
};

export const tokens = {
  get: () => read(TOKENS, null),
  set: (v) => write(TOKENS, v),
  clear: () => localStorage.removeItem(TOKENS),
};
export const clearQueue = () => localStorage.removeItem(QUEUE);

export class ApiError extends Error {
  constructor(status, data) {
    super(`API ${status}`);
    this.status = status; // 0 — нет связи с сервером
    this.data = data;
  }
}

let onAuthLost = () => {};
export const setAuthLostHandler = (fn) => {
  onAuthLost = fn;
};

async function raw(method, path, body, access) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, null);
  }
  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      /* пустой ответ */
    }
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

let refreshing = null;
function refreshAccess() {
  const t = tokens.get();
  if (!t?.refresh) return Promise.resolve(false);
  refreshing ??= raw('POST', '/auth/refresh/', { refresh: t.refresh })
    .then((d) => {
      tokens.set({ ...t, access: d.access, ...(d.refresh ? { refresh: d.refresh } : {}) });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// обычный запрос; при 401 один раз пробуем обновить токен
export async function request(method, path, body, anon = false) {
  try {
    return await raw(method, path, body, anon ? null : tokens.get()?.access);
  } catch (e) {
    if (e.status === 401 && !anon) {
      if (await refreshAccess()) return raw(method, path, body, tokens.get()?.access);
      tokens.clear();
      onAuthLost();
    }
    throw e;
  }
}

// ---------- запись с офлайн-очередью ----------
// Если сети нет, запрос откладывается и уходит на сервер, когда связь появится.
const readQ = () => read(QUEUE, []);

export async function send(method, path, body) {
  const q = readQ();
  if (!q.length) {
    try {
      return await request(method, path, body);
    } catch (e) {
      if (e.status !== 0) throw e;
    }
  }
  write(QUEUE, [...readQ(), { method, path, body }]);
  return null;
}

let flushing = false;
export async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const q = readQ();
      if (!q.length) return;
      try {
        await request(q[0].method, q[0].path, q[0].body);
      } catch (e) {
        if (e.status === 0) return; // всё ещё офлайн
      }
      write(QUEUE, readQ().slice(1));
    }
  } finally {
    flushing = false;
  }
}

// ---------- методы ----------
const list = async (path) => {
  const d = await request('GET', path);
  return Array.isArray(d) ? d : d?.results || []; // работает и с пагинацией DRF
};

export const api = {
  async login(email, password) {
    const d = await request('POST', '/auth/login/', { email, password }, true);
    tokens.set({ access: d.access, refresh: d.refresh });
  },
  register: (name, email, password) => request('POST', '/auth/register/', { name, email, password }, true),
  me: () => request('GET', '/auth/me/'),
  habits: () => list('/habits/'),
  mood: () => list('/mood/'),
  gratitude: () => list('/gratitude/'),
  createHabit: (h) => request('POST', '/habits/', toApiHabit(h)),
};

// ---------- преобразование форматов (на фронте camelCase, на сервере snake_case) ----------
export const fromApiHabit = (h) => ({
  id: h.id,
  icon: h.icon,
  name: h.name,
  category: h.category,
  freq: h.freq,
  days: h.days || [],
  times: h.times_per_week || 3,
  reminder: h.reminder_time ? h.reminder_time.slice(0, 5) : '',
  archived: !!h.archived,
  createdAt: (h.created_at || '').slice(0, 10),
  log: Object.fromEntries((h.completions || []).map((d) => [d, true])),
});

export const toApiHabit = (h) => ({
  name: h.name,
  icon: h.icon,
  category: h.category,
  freq: h.freq,
  days: h.days,
  times_per_week: h.times,
  reminder_time: h.reminder || null,
});
