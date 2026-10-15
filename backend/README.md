# Mindful — backend (Django + DRF)

Реализует контракт из `API.md`: JWT-вход по email, привычки, настроение, дневник благодарности, email-напоминания.

## Запуск

```bash
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser                  # для /admin/
python manage.py runserver                        # http://localhost:8000
```

Фронт: в `mindful/.env` → `VITE_API_URL=http://localhost:8000`, затем `npm run dev`.

## Тесты

```bash
python manage.py test
```

## Структура

- `accounts/` — свой `User` (вход по email, `name`, `timezone`, `language`, `theme`), регистрация, `/auth/me/`.
- `tracker/` — `Habit`, `Completion`, `MoodEntry`, `GratitudeEntry`, API, напоминания.
- `config/` — настройки, urls, Celery.

## Важные детали

- Все данные фильтруются по `request.user`; чужой объект → `404`.
- Запись идемпотентна (фронт повторяет запросы из офлайн-очереди): `check` — `get_or_create`/`delete`, `PUT /mood|gratitude/{date}/` — `update_or_create`, `DELETE` всегда `204`.
- `PUT` заменяет запись целиком; `201` при создании, `200` при замене.
- `days`: 0 = воскресенье … 6 = суббота. `reminder_time` отдаётся как `"HH:MM"`.
- Списки без пагинации. Refresh-токен ротируется (фронт это понимает).

## Напоминания

Письмо уходит, если наступило `reminder_time` в часовом поясе пользователя (окно `REMINDER_GRACE_MINUTES`, по умолчанию 10), привычка «на сегодня», не отмечена и сегодня ещё не напоминали.

Два способа запуска, выбери один:

```bash
# 1) Без Redis — cron, каждую минуту
* * * * * cd /path/to/backend && venv/bin/python manage.py send_reminders

# 2) Celery (нужен Redis)
celery -A config worker -l info
celery -A config beat -l info
```

По умолчанию письма печатаются в консоль. Для реальной отправки задай SMTP в `.env` (см. `.env.example`).

## Продакшен

`DJANGO_DEBUG=0`, свой `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, PostgreSQL (`DB_*`), `python manage.py collectstatic`, gunicorn за nginx.
