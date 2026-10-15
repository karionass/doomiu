import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("mindful")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Раз в минуту проверяем, кому пора отправить напоминание.
app.conf.beat_schedule = {
    "send-habit-reminders": {
        "task": "tracker.tasks.send_habit_reminders",
        "schedule": 60.0,
    }
}
