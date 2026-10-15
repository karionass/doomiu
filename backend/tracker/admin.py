from django.contrib import admin

from .models import Completion, GratitudeEntry, Habit, MoodEntry


class CompletionInline(admin.TabularInline):
    model = Completion
    extra = 0


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "category", "freq", "reminder_time", "archived", "created_at")
    list_filter = ("category", "freq", "archived")
    search_fields = ("name", "user__email")
    inlines = [CompletionInline]


@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "level", "tags")
    list_filter = ("level",)
    search_fields = ("user__email",)
    date_hierarchy = "date"


@admin.register(GratitudeEntry)
class GratitudeEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "items")
    search_fields = ("user__email",)
    date_hierarchy = "date"
