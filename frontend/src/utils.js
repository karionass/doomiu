import { useState, useEffect } from 'react';

// ---------- хранилище в браузере (localStorage) ----------
export function useLocal(storageKey, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ничего страшного */
    }
  }, [storageKey, value]);
  return [value, setValue];
}

// ---------- даты ----------
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// названия месяцев и дней недели берём у браузера — они сами переводятся на нужный язык
export const monthName = (m, locale) => new Date(2024, m, 1).toLocaleDateString(locale, { month: 'long' });
export const weekdayShort = (dayIdx, locale) => new Date(2023, 0, 1 + dayIdx).toLocaleDateString(locale, { weekday: 'short' }); // 0 = воскресенье
export const prettyDate = (d, locale) => d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

// ---------- привычки ----------
// freq: 'daily' — каждый день, 'days' — по дням недели, 'times' — N раз в неделю
export function isScheduled(habit, date = new Date()) {
  if (habit.freq === 'days') return habit.days.includes(date.getDay());
  return true;
}

export const weekStart = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() + 6) % 7)); // понедельник
};

// выполнено за [from, to)
const countBetween = (habit, from, to) => {
  let c = 0;
  for (let d = from; d < to; d = addDays(d, 1)) if (habit.log[dateKey(d)]) c++;
  return c;
};

// сколько раз выполнено на неделе, в которую входит день d
export const weekCount = (habit, d = new Date()) => countBetween(habit, weekStart(d), addDays(weekStart(d), 7));

// нужно ли выполнять привычку в этот день.
// Для «N раз в неделю»: пока цель недели не выполнена (или день уже отмечен).
export function isDue(habit, d = new Date()) {
  if (habit.freq !== 'times') return isScheduled(habit, d);
  if (habit.log[dateKey(d)]) return true;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return countBetween(habit, weekStart(d), day) < habit.times;
}

// для «N раз в неделю» серия считается неделями, для остальных — днями
export const streakUnit = (habit) => (habit.freq === 'times' ? 'weeks' : 'days');

export function streak(habit) {
  if (habit.freq === 'times') {
    let w = weekStart(new Date());
    let n = weekCount(habit, w) >= habit.times ? 1 : 0; // текущую неделю ещё можно добить
    w = addDays(w, -7);
    for (let i = 0; i < 200 && weekCount(habit, w) >= habit.times; i++) {
      n++;
      w = addDays(w, -7);
    }
    return n;
  }
  let d = new Date();
  if (!habit.log[dateKey(d)]) d = addDays(d, -1); // сегодня ещё можно успеть
  let n = 0;
  for (let i = 0; i < 400; i++) {
    if (!isScheduled(habit, d)) {
      d = addDays(d, -1);
      continue;
    }
    if (habit.log[dateKey(d)]) {
      n++;
      d = addDays(d, -1);
    } else break;
  }
  return n;
}

// ---------- демо-данные ----------
export function seedHabits() {
  const today = new Date();
  const make = (id, icon, name, category, freq, extra = {}) => {
    const log = {};
    for (let i = 1; i <= 60; i++) {
      if ((i * 7 + id * 3) % 5 !== 0) log[dateKey(addDays(today, -i))] = true;
    }
    return { id, icon, name, category, freq, days: [], times: 3, reminder: '', archived: false, createdAt: dateKey(addDays(today, -60)), log, ...extra };
  };
  return [
    make(1, '💧', 'Пить 2 л воды', 'health', 'daily', { reminder: '09:00' }),
    make(2, '📚', 'Учёба 30 минут', 'study', 'days', { days: [1, 2, 3, 4, 5] }),
    make(3, '🧘', 'Медитация', 'rest', 'daily'),
    make(4, '🏃', 'Пробежка', 'health', 'times', { times: 3 }),
  ];
}

export function seedMoods() {
  const today = new Date();
  const res = {};
  const tags = [['study'], ['sleep'], ['friends'], ['work', 'sleep'], []];
  for (let i = 1; i <= 25; i++) {
    res[dateKey(addDays(today, -i))] = {
      level: 2 + ((i * 3 + (i % 4)) % 4),
      tags: tags[i % tags.length],
      note: '',
    };
  }
  return res;
}
