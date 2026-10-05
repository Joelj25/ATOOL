"""Chat API: rule-based campus assistant (no LLM yet — canned + real-data replies).

Student questions are answered from the signed-in student's real data.
Faculty get a short orientation reply (their data lives on the dashboard).
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

import database
from deps import get_current_user
from models import Role, User
from student import TIMETABLE as WEEKLY_TIMETABLE, fmt_time, _course_map

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
def send_message(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(database.get_db),
):
    """Rule-based assistant: answers attendance/timetable/assignment questions
    with real data. Swap this handler for an LLM call later."""
    text = payload.message.lower()

    if current_user.role == Role.faculty:
        return ChatResponse(
            reply=(
                f"Hi {current_user.name.split()[0]}! Faculty tools live on your dashboard: "
                "add students, mark attendance, and create assignments/tests."
            )
        )

    student = current_user.student
    if student is None:
        return ChatResponse(reply="Your account has no student profile linked. Please contact the administration.")

    from datetime import date, datetime

    import models

    today = date.today()

    # --- attendance ---
    if any(k in text for k in ["attendance", "present", "absent", "percentage"]):
        rows = db.query(models.Attendance).filter(models.Attendance.student_id == student.id).all()
        total = len(rows)
        present = sum(1 for r in rows if r.status == models.AttendanceStatus.present)
        pct = round(present / total * 100, 1) if total else 0.0
        lines = [f"Your overall attendance is **{pct}%** ({present}/{total} classes)."]
        if pct < 75:
            lines.append("⚠️ You are below the 75% requirement.")
        return ChatResponse(reply="\n".join(lines))

    # --- timetable / next class ---
    if any(k in text for k in ["timetable", "schedule", "next class", "today", "class"]):
        now = datetime.now()
        courses = _course_map(db)
        slots = WEEKLY_TIMETABLE.get(now.date().weekday(), [])
        upcoming = [s for s in slots if s[2] > now.time()]
        if not upcoming:
            return ChatResponse(reply="You have no classes left today. Enjoy the free day! 🎉")
        code, start, end, room, faculty_name = upcoming[0]
        course = courses.get(code)
        return ChatResponse(
            reply=(
                f"Your next class is **{course.course_name if course else code}** ({code}) "
                f"at {fmt_time(start)} in {room} with {faculty_name}."
            )
        )

    # --- assignments / tests ---
    if any(k in text for k in ["assignment", "homework", "due", "deadline"]):
        items = (
            db.query(models.Assignment)
            .filter(models.Assignment.due_date >= today)
            .order_by(models.Assignment.due_date)
            .limit(6)
            .all()
        )
        if not items:
            return ChatResponse(reply="You have no upcoming assignments. 🎉")
        lines = "\n".join(f"• {a.title} — due {a.due_date.strftime('%b %d')}" for a in items)
        return ChatResponse(reply=f"You have {len(items)} upcoming assignment(s):\n{lines}")

    if any(k in text for k in ["test", "exam", "quiz", "midterm"]):
        items = (
            db.query(models.Test)
            .filter(models.Test.test_date >= today)
            .order_by(models.Test.test_date)
            .limit(6)
            .all()
        )
        if not items:
            return ChatResponse(reply="No tests are scheduled right now.")
        lines = "\n".join(f"• {t.title} — {t.test_date.strftime('%b %d')} ({t.total_marks} marks)" for t in items)
        return ChatResponse(reply=f"Upcoming tests:\n{lines}")

    # --- greeting / fallback ---
    if any(k in text for k in ["hi", "hello", "hey"]):
        return ChatResponse(
            reply=f"Hi {current_user.name.split()[0]}! Ask me about your attendance, timetable, or assignments."
        )

    return ChatResponse(
        reply="I can help with your **attendance**, **timetable**, **assignments**, and **tests**. "
        "(LLM integration coming soon — for now I answer campus FAQs.)"
    )
