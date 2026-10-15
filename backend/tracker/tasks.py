from celery import shared_task

from .reminders import send_due_reminders


@shared_task
def send_habit_reminders():
    return send_due_reminders()
