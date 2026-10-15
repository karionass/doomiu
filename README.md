# Mindful — трекер привычек и ментального здоровья

`mindful/` — фронтенд (React + Vite, PWA), `backend/` — бэкенд (Django + DRF + JWT). Контракт — `mindful/API.md`.

## Быстро: всё одной командой (Docker)

```bash
docker compose up --build
```

- Приложение: http://localhost:5173
- API: http://localhost:8000/api/ · админка: http://localhost:8000/admin/
- Админ: `docker compose exec backend python manage.py createsuperuser`
- Состав: PostgreSQL, Redis, Django (gunicorn), Celery worker + beat (email-напоминания), фронт на nginx.
- Письма по умолчанию пишутся в логи: `docker compose logs -f worker`. Для реальной отправки задай `EMAIL_*` (см. `docker-compose.yml`) и `DJANGO_SECRET_KEY` в `.env` рядом с compose-файлом.

## Локальная разработка (без Docker)

Бэкенд:
```bash
cd backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver                          # :8000, SQLite, письма в консоль
```

Фронт (в `mindful/.env` уже стоит `VITE_API_URL=http://localhost:8000`):
```bash
cd mindful
npm install
npm run dev                                         # :5173
```

Напоминания без Redis: `python manage.py send_reminders` раз в минуту через cron.

## Проверка перед защитой

1. Регистрация → вход → создать привычку → отметить → обновить страницу: данные на месте.
2. Настроение и благодарность видны после перезагрузки.
3. DevTools → Network → Offline → отметить привычку → включить сеть: отметка появляется на сервере.
4. Тесты бэкенда: `cd backend && python manage.py test` (18 тестов).

## Что проверено

- Сборка фронта (`npm run build`) и тесты бэкенда проходят.
- Настоящий `src/api.js` прогнан против живого бэкенда: регистрация, дубль email (400), неверный пароль (401), вход, профиль, создание привычки, отметки, настроение, благодарность, офлайн-очередь с досылкой и повторной отправкой.
- Не проверено: `docker compose` (в моём окружении нет Docker) и реальная отправка почты по SMTP.

## Не сделано

- Вход через Google (в контракте «позже», кнопки на фронте нет).
