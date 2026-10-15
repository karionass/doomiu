from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Habit(models.Model):
    class Category(models.TextChoices):
        HEALTH = "health"
        STUDY = "study"
        WORK = "work"
        REST = "rest"
        HOME = "home"
        OTHER = "other"

    class Freq(models.TextChoices):
        DAILY = "daily"  # каждый день
        DAYS = "days"  # по дням недели (поле days)
        TIMES = "times"  # N раз в неделю (поле times_per_week)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="habits")
    name = models.CharField(max_length=120)
    icon = models.CharField(max_length=16, default="✨", blank=True)
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.OTHER)
    freq = models.CharField(max_length=10, choices=Freq.choices, default=Freq.DAILY)
    days = models.JSONField(default=list, blank=True)  # 0 = воскресенье … 6 = суббота
    times_per_week = models.PositiveSmallIntegerField(
        default=3, validators=[MinValueValidator(1), MaxValueValidator(7)]
    )
    reminder_time = models.TimeField(null=True, blank=True)  # в часовом поясе пользователя
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_reminded_on = models.DateField(null=True, blank=True)  # локальная дата пользователя

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.icon} {self.name}"


class Completion(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name="completions")
    date = models.DateField()

    class Meta:
        ordering = ["date"]
        constraints = [models.UniqueConstraint(fields=["habit", "date"], name="uniq_completion_per_day")]

    def __str__(self):
        return f"{self.habit_id} @ {self.date}"


class MoodEntry(models.Model):
    TAGS = ("work", "study", "sleep", "relations", "family", "friends", "health", "sport")

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mood_entries")
    date = models.DateField()
    level = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    tags = models.JSONField(default=list, blank=True)
    note = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "mood entries"
        constraints = [models.UniqueConstraint(fields=["user", "date"], name="uniq_mood_per_day")]

    def __str__(self):
        return f"{self.user_id} {self.date}: {self.level}"


class GratitudeEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gratitude_entries")
    date = models.DateField()
    items = models.JSONField(default=list, blank=True)  # до 3 строк
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "gratitude entries"
        constraints = [models.UniqueConstraint(fields=["user", "date"], name="uniq_gratitude_per_day")]

    def __str__(self):
        return f"{self.user_id} {self.date}"
