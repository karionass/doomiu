from rest_framework import serializers

from .models import GratitudeEntry, Habit, MoodEntry


class HabitSerializer(serializers.ModelSerializer):
    completions = serializers.SerializerMethodField()
    days = serializers.ListField(child=serializers.IntegerField(min_value=0, max_value=6), required=False)
    reminder_time = serializers.TimeField(required=False, allow_null=True, format="%H:%M")
    icon = serializers.CharField(max_length=16, required=False, allow_blank=True)

    class Meta:
        model = Habit
        fields = (
            "id", "name", "icon", "category", "freq", "days", "times_per_week",
            "reminder_time", "archived", "created_at", "completions",
        )
        read_only_fields = ("id", "created_at")

    def get_completions(self, obj):
        # completions подгружены через prefetch_related
        return sorted(c.date.isoformat() for c in obj.completions.all())

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Название не может быть пустым.")
        return value

    def validate_days(self, value):
        return sorted(set(value))

    def validate(self, attrs):
        freq = attrs.get("freq", getattr(self.instance, "freq", Habit.Freq.DAILY))
        days = attrs.get("days", getattr(self.instance, "days", []))
        if freq == Habit.Freq.DAYS and not days:
            raise serializers.ValidationError({"days": "Выбери хотя бы один день недели."})
        # у ежедневной привычки список дней не нужен
        if freq == Habit.Freq.DAILY and "days" in attrs:
            attrs["days"] = []
        return attrs

    def update(self, instance, validated):
        # при смене времени напоминания разрешаем отправить его снова сегодня
        if "reminder_time" in validated and validated["reminder_time"] != instance.reminder_time:
            validated["last_reminded_on"] = None
        return super().update(instance, validated)


class CheckSerializer(serializers.Serializer):
    date = serializers.DateField()
    done = serializers.BooleanField()


class MoodSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(child=serializers.ChoiceField(choices=MoodEntry.TAGS), required=False)
    note = serializers.CharField(required=False, allow_blank=True, max_length=5000)

    class Meta:
        model = MoodEntry
        fields = ("date", "level", "tags", "note")
        read_only_fields = ("date",)

    def validate_tags(self, value):
        return list(dict.fromkeys(value))  # без дублей, порядок сохраняем


class GratitudeSerializer(serializers.ModelSerializer):
    items = serializers.ListField(
        child=serializers.CharField(allow_blank=True, max_length=500), max_length=3, required=True
    )

    class Meta:
        model = GratitudeEntry
        fields = ("date", "items")
        read_only_fields = ("date",)
