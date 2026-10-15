"""Email-напоминания о привычках.

Запускается каждую минуту (Celery beat или cron + `manage.py send_reminders`).
Напоминание уходит, если:
  * привычка не в архиве и у неё задан reminder_time;
  * по локальному времени пользователя reminder_time уже наступило (не позже REMINDER_GRACE_MINUTES назад);
  * привычка «на сегодня» (daily / нужный день недели / недельная норма ещё не выполнена);
  * сегодня она ещё не отмечена и напоминание сегодня ещё не отправлялось.
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Completion, Habit

TEXTS = {
    "ru": ("Mindful: пора — «{name}»", "Привет, {user}!\n\nНапоминаем о привычке «{name}». Отметь её в приложении, когда сделаешь."),
    "en": ("Mindful: time for “{name}”", "Hi {user}!\n\nA reminder about your habit “{name}”. Check it off in the app once it's done."),
    "kk": ("Mindful: «{name}» уақыты келді", "Сәлем, {user}!\n\n«{name}» әдеті туралы еске саламыз. Орындаған соң қолданбада белгіле."),
}


def js_weekday(d):
    """0 = воскресенье … 6 = суббота (как в API)."""
    return (d.weekday() + 1) % 7


def is_due(habit, today):
    if habit.freq == Habit.Freq.DAILY:
        return True
    if habit.freq == Habit.Freq.DAYS:
        return js_weekday(today) in (habit.days or [])
    # times: напоминаем, пока недельная норма (с понедельника) не выполнена
    monday = today - timedelta(days=today.weekday())
    done = Completion.objects.filter(habit=habit, date__gte=monday, date__lte=today).count()
    return done < habit.times_per_week


def _local_now(user, now_utc):
    try:
        return now_utc.astimezone(ZoneInfo(user.timezone))
    except Exception:
        return now_utc.astimezone(ZoneInfo("UTC"))


def send_due_reminders(now=None):
    """Возвращает число отправленных писем."""
    now_utc = now or timezone.now()
    grace = timedelta(minutes=settings.REMINDER_GRACE_MINUTES)
    habits = (
        Habit.objects.filter(archived=False, reminder_time__isnull=False, user__is_active=True)
        .select_related("user")
    )
    sent = 0
    for habit in habits:
        user = habit.user
        local = _local_now(user, now_utc)
        today = local.date()
        if habit.last_reminded_on == today:
            continue
        due_at = datetime.combine(today, habit.reminder_time, tzinfo=local.tzinfo)
        if not (due_at <= local < due_at + grace):
            continue
        if Completion.objects.filter(habit=habit, date=today).exists() or not is_due(habit, today):
            continue
        subject, body = TEXTS.get(user.language, TEXTS["ru"])
        who = user.name or user.email.split("@")[0]
        send_mail(
            subject.format(name=habit.name),
            body.format(name=habit.name, user=who),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,  # сбой почты не должен ронять остальные напоминания
        )
        # помечаем до/независимо от результата: повторять каждую минуту нет смысла
        Habit.objects.filter(pk=habit.pk).update(last_reminded_on=today)
        sent += 1
    return sent
