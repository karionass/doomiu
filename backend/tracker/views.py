from datetime import date as date_cls

from django.http import Http404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import Completion, GratitudeEntry, Habit, MoodEntry
from .serializers import CheckSerializer, GratitudeSerializer, HabitSerializer, MoodSerializer


class HabitViewSet(ModelViewSet):
    serializer_class = HabitSerializer

    def get_queryset(self):
        return Habit.objects.filter(user=self.request.user).prefetch_related("completions")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="check")
    def check(self, request, pk=None):
        """Идемпотентно: done=true создаёт отметку (если её нет), done=false удаляет."""
        habit = self.get_object()
        s = CheckSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        day, done = s.validated_data["date"], s.validated_data["done"]
        if done:
            Completion.objects.get_or_create(habit=habit, date=day)
        else:
            Completion.objects.filter(habit=habit, date=day).delete()
        return Response({"date": day.isoformat(), "done": done})


class DateEntryView(APIView):
    """Записи «одна на пользователя и день»: PUT (создать или заменить) и DELETE. Оба идемпотентны."""

    model = None
    serializer_class = None

    def _parse_date(self, value):
        try:
            return date_cls.fromisoformat(value)
        except ValueError:
            raise Http404

    def put(self, request, date):
        day = self._parse_date(date)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        # заменяем запись целиком: не переданные необязательные поля сбрасываются
        defaults = {**self.reset_values, **serializer.validated_data}
        obj, created = self.model.objects.update_or_create(user=request.user, date=day, defaults=defaults)
        data = self.serializer_class(obj).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, date):
        day = self._parse_date(date)
        self.model.objects.filter(user=request.user, date=day).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)  # записи нет — тоже 204

    reset_values = {}


class MoodListView(APIView):
    def get(self, request):
        qs = MoodEntry.objects.filter(user=request.user)
        return Response(MoodSerializer(qs, many=True).data)


class MoodDetailView(DateEntryView):
    model = MoodEntry
    serializer_class = MoodSerializer
    reset_values = {"tags": [], "note": ""}


class GratitudeListView(APIView):
    def get(self, request):
        qs = GratitudeEntry.objects.filter(user=request.user)
        return Response(GratitudeSerializer(qs, many=True).data)


class GratitudeDetailView(DateEntryView):
    model = GratitudeEntry
    serializer_class = GratitudeSerializer
