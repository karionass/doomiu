from datetime import datetime, timezone as dt_tz

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from tracker.models import Habit
from tracker.reminders import send_due_reminders


class Base(TestCase):
    def setUp(self):
        self.c = APIClient()
        self.user = User.objects.create_user("a@example.com", "pass-12345", name="Аня")
        self.login(self.c, "a@example.com")

    def login(self, client, email, password="pass-12345"):
        r = client.post("/api/auth/login/", {"email": email, "password": password}, format="json")
        assert r.status_code == 200, r.content
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")


class AuthTests(TestCase):
    def test_register_login_me_refresh(self):
        c = APIClient()
        r = c.post("/api/auth/register/", {"name": "Кара", "email": "Kara@Example.com", "password": "strong-pass-1"}, format="json")
        self.assertEqual(r.status_code, 201)
        r = c.post("/api/auth/login/", {"email": "kara@example.com", "password": "strong-pass-1"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("refresh", r.data)
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        me = c.get("/api/auth/me/").data
        self.assertEqual(me, {"email": "kara@example.com", "name": "Кара", "timezone": "Asia/Almaty", "language": "ru", "theme": "light"})
        r2 = c.post("/api/auth/refresh/", {"refresh": r.data["refresh"]}, format="json")
        self.assertEqual(r2.status_code, 200)
        self.assertIn("access", r2.data)

    def test_duplicate_email_400(self):
        User.objects.create_user("x@example.com", "pass-12345")
        r = APIClient().post("/api/auth/register/", {"name": "X", "email": "X@example.com", "password": "strong-pass-1"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("email", r.data)

    def test_bad_login_401(self):
        User.objects.create_user("x@example.com", "pass-12345")
        r = APIClient().post("/api/auth/login/", {"email": "x@example.com", "password": "nope"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_short_password_400(self):
        r = APIClient().post("/api/auth/register/", {"name": "X", "email": "s@example.com", "password": "short"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("password", r.data)

    def test_patch_me(self):
        u = User.objects.create_user("p@example.com", "pass-12345")
        c = APIClient()
        c.force_authenticate(u)
        r = c.patch("/api/auth/me/", {"timezone": "Europe/Moscow", "language": "kk", "theme": "dark", "name": "Новое", "email": "hack@example.com"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["email"], "p@example.com")  # email не меняется
        self.assertEqual((r.data["timezone"], r.data["language"], r.data["theme"]), ("Europe/Moscow", "kk", "dark"))
        self.assertEqual(c.patch("/api/auth/me/", {"timezone": "Mars/Base"}, format="json").status_code, 400)
        self.assertEqual(c.patch("/api/auth/me/", {"language": "de"}, format="json").status_code, 400)

    def test_requires_auth(self):
        for url in ("/api/habits/", "/api/mood/", "/api/gratitude/", "/api/auth/me/"):
            self.assertEqual(APIClient().get(url).status_code, 401, url)


class HabitTests(Base):
    payload = {"name": "Пить 2 л воды", "icon": "💧", "category": "health", "freq": "daily", "days": [], "times_per_week": 3, "reminder_time": "09:00"}

    def test_crud_and_shape(self):
        r = self.c.post("/api/habits/", self.payload, format="json")
        self.assertEqual(r.status_code, 201)
        h = r.data
        self.assertEqual(h["reminder_time"], "09:00")
        self.assertEqual(h["completions"], [])
        self.assertEqual(set(h), {"id", "name", "icon", "category", "freq", "days", "times_per_week", "reminder_time", "archived", "created_at", "completions"})
        r = self.c.patch(f"/api/habits/{h['id']}/", {"archived": True}, format="json")
        self.assertTrue(r.data["archived"])
        self.assertEqual(self.c.get("/api/habits/").data[0]["archived"], True)  # архивные тоже в списке
        self.assertEqual(self.c.delete(f"/api/habits/{h['id']}/").status_code, 204)
        self.assertEqual(self.c.get("/api/habits/").data, [])

    def test_null_reminder_and_validation(self):
        r = self.c.post("/api/habits/", {**self.payload, "reminder_time": None}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(r.data["reminder_time"])
        self.assertEqual(self.c.post("/api/habits/", {**self.payload, "freq": "days", "days": []}, format="json").status_code, 400)
        self.assertEqual(self.c.post("/api/habits/", {**self.payload, "days": [7]}, format="json").status_code, 400)
        self.assertEqual(self.c.post("/api/habits/", {**self.payload, "category": "x"}, format="json").status_code, 400)
        self.assertEqual(self.c.post("/api/habits/", {**self.payload, "freq": "times", "times_per_week": 0}, format="json").status_code, 400)

    def test_check_is_idempotent(self):
        hid = self.c.post("/api/habits/", self.payload, format="json").data["id"]
        body = {"date": "2026-10-15", "done": True}
        for _ in range(3):
            self.assertEqual(self.c.post(f"/api/habits/{hid}/check/", body, format="json").status_code, 200)
        self.assertEqual(self.c.get("/api/habits/").data[0]["completions"], ["2026-10-15"])
        for _ in range(2):
            self.assertEqual(self.c.post(f"/api/habits/{hid}/check/", {"date": "2026-10-15", "done": False}, format="json").status_code, 200)
        self.assertEqual(self.c.get("/api/habits/").data[0]["completions"], [])
        self.assertEqual(self.c.post(f"/api/habits/{hid}/check/", {"date": "bad", "done": True}, format="json").status_code, 400)

    def test_isolation_between_users(self):
        hid = self.c.post("/api/habits/", self.payload, format="json").data["id"]
        other = APIClient()
        User.objects.create_user("b@example.com", "pass-12345")
        self.login(other, "b@example.com")
        self.assertEqual(other.get("/api/habits/").data, [])
        self.assertEqual(other.patch(f"/api/habits/{hid}/", {"name": "x"}, format="json").status_code, 404)
        self.assertEqual(other.delete(f"/api/habits/{hid}/").status_code, 404)
        self.assertEqual(other.post(f"/api/habits/{hid}/check/", {"date": "2026-10-15", "done": True}, format="json").status_code, 404)


class MoodGratitudeTests(Base):
    def test_mood_upsert(self):
        body = {"level": 4, "tags": ["work", "sleep", "work"], "note": "ок"}
        r = self.c.put("/api/mood/2026-10-15/", body, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data, {"date": "2026-10-15", "level": 4, "tags": ["work", "sleep"], "note": "ок"})
        r = self.c.put("/api/mood/2026-10-15/", {"level": 2, "tags": [], "note": ""}, format="json")
        self.assertEqual(r.status_code, 200)
        data = self.c.get("/api/mood/").data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["level"], 2)
        # повтор того же запроса ничего не ломает
        self.assertEqual(self.c.put("/api/mood/2026-10-15/", {"level": 2, "tags": [], "note": ""}, format="json").status_code, 200)

    def test_mood_validation_leaves_no_row(self):
        self.assertEqual(self.c.put("/api/mood/2026-10-15/", {"level": 9}, format="json").status_code, 400)
        self.assertEqual(self.c.put("/api/mood/2026-10-15/", {"level": 3, "tags": ["bad"]}, format="json").status_code, 400)
        self.assertEqual(self.c.put("/api/mood/not-a-date/", {"level": 3}, format="json").status_code, 404)
        self.assertEqual(self.c.get("/api/mood/").data, [])

    def test_mood_delete(self):
        self.c.put("/api/mood/2026-10-15/", {"level": 3}, format="json")
        self.assertEqual(self.c.delete("/api/mood/2026-10-15/").status_code, 204)
        self.assertEqual(self.c.delete("/api/mood/2026-10-15/").status_code, 204)
        self.assertEqual(self.c.get("/api/mood/").data, [])

    def test_gratitude(self):
        r = self.c.put("/api/gratitude/2026-10-15/", {"items": ["чай", "", "звонок маме"]}, format="json")
        self.assertEqual(r.status_code, 201)
        r = self.c.put("/api/gratitude/2026-10-15/", {"items": ["солнце"]}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.c.get("/api/gratitude/").data, [{"date": "2026-10-15", "items": ["солнце"]}])
        self.assertEqual(self.c.put("/api/gratitude/2026-10-16/", {"items": ["1", "2", "3", "4"]}, format="json").status_code, 400)

    def test_isolation(self):
        self.c.put("/api/mood/2026-10-15/", {"level": 3}, format="json")
        other = APIClient()
        User.objects.create_user("b@example.com", "pass-12345")
        self.login(other, "b@example.com")
        self.assertEqual(other.get("/api/mood/").data, [])
        other.put("/api/mood/2026-10-15/", {"level": 5}, format="json")
        self.assertEqual(self.c.get("/api/mood/").data[0]["level"], 3)


class ReminderTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("r@example.com", "pass-12345", name="Рая", timezone="Asia/Almaty")  # UTC+5
        self.habit = Habit.objects.create(user=self.user, name="Йога", freq="daily", reminder_time="09:00")

    def at(self, h, m):  # момент по UTC; Алматы = UTC+5, 2026-10-15 (четверг)
        return datetime(2026, 10, 15, h, m, tzinfo=dt_tz.utc)

    def test_sent_once_in_users_timezone(self):
        self.assertEqual(send_due_reminders(self.at(3, 0)), 0)  # 08:00 по Алматы — рано
        self.assertEqual(send_due_reminders(self.at(4, 0)), 1)  # 09:00 по Алматы
        self.assertEqual(send_due_reminders(self.at(4, 1)), 0)  # повторно не шлём
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["r@example.com"])
        self.assertIn("Йога", mail.outbox[0].subject)

    def test_skips_done_archived_and_wrong_day(self):
        self.habit.completions.create(date="2026-10-15")
        self.assertEqual(send_due_reminders(self.at(4, 0)), 0)
        self.habit.completions.all().delete()
        Habit.objects.filter(pk=self.habit.pk).update(archived=True)
        self.assertEqual(send_due_reminders(self.at(4, 0)), 0)
        Habit.objects.filter(pk=self.habit.pk).update(archived=False, freq="days", days=[1])  # только по понедельникам
        self.assertEqual(send_due_reminders(self.at(4, 0)), 0)
        Habit.objects.filter(pk=self.habit.pk).update(days=[4])  # четверг = 4
        self.assertEqual(send_due_reminders(self.at(4, 0)), 1)

    def test_grace_window(self):
        self.assertEqual(send_due_reminders(self.at(4, 30)), 0)  # опоздали больше чем на 10 минут
        self.assertEqual(send_due_reminders(self.at(4, 5)), 1)
