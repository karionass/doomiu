from django.core.management.base import BaseCommand

from tracker.reminders import send_due_reminders


class Command(BaseCommand):
    help = "Отправить email-напоминания о привычках. Запускать каждую минуту (cron) — Redis/Celery не нужны."

    def handle(self, *args, **options):
        n = send_due_reminders()
        self.stdout.write(f"Отправлено напоминаний: {n}")
