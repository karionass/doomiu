from django.urls import path, re_path
from rest_framework.routers import SimpleRouter

from .views import GratitudeDetailView, GratitudeListView, HabitViewSet, MoodDetailView, MoodListView

router = SimpleRouter()
router.register("habits", HabitViewSet, basename="habit")

DATE = r"(?P<date>\d{4}-\d{2}-\d{2})"

urlpatterns = router.urls + [
    path("mood/", MoodListView.as_view()),
    re_path(rf"^mood/{DATE}/$", MoodDetailView.as_view()),
    path("gratitude/", GratitudeListView.as_view()),
    re_path(rf"^gratitude/{DATE}/$", GratitudeDetailView.as_view()),
]
