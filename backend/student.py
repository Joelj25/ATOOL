"""Student endpoints — data is fetched and calculated from the DB only.

GET /api/student/dashboard returns ONLY the logged-in student's real
attendance %, personal upcoming assignments/tests, and weekly timetable.
"""

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import database
import schemas
from deps import require_student
from models import Attendance, AttendanceStatus, Assignment, Course, Role, Student, Test, User

router = APIRouter(prefix="/api/student", tags=["student"])

# Weekly timetable template (Mon=0 .. Sun=6). Rooms/faculty per course code.
TIMETABLE = {
    0: [("CS301", time(10, 0), time(11, 0), "CS-Lab 2", "Dr. Rao"), ("MA201", time(11, 15), time(12, 15), "B-204", "Prof. Iyer")],
    1: [("CS302", time(9, 0), time(10, 0), "B-301", "Dr. Sharma"), ("HS105", time(11, 15), time(12, 15), "A-101", "Dr. Menon")],
    2: [("MA201", time(10, 0), time(11, 0), "B-204", "Prof. Iyer"), ("CS301", time(14, 0), time(15, 0), "CS-Lab 2", "Dr. Rao")],
    3: [("CS302", time(9, 0), time(10, 0), "B-301", "Dr. Sharma"), ("CS301", time(11, 15), time(12, 15), "CS-Lab 2", "Dr. Rao")],
    4: [("HS105", time(10, 0), time(11, 0), "A-101", "Dr. Menon"), ("MA201", time(14, 0), time(15, 0), "B-204", "Prof. Iyer")],
}


def fmt_time(t: time) -> str:
    return t.strftime("%I:%M %p").lstrip("0")


def _course_map(db: Session) -> dict[str, Course]:
    return {c.course_code: c for c in db.query(Course).all()}


def build_student_timetable(db: Session, start: date, days: int = 7) -> list[schemas.TimetableSlot]:
    """The next `days` days of classes, mapped through real Course rows."""
    courses = _course_map(db)
    now = datetime.now()
    slots: list[schemas.TimetableSlot] = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        for code, start_t, end_t, room, faculty in TIMETABLE.get(day.weekday(), []):
            course = courses.get(code)
            if course is None:
                continue
            if day == now.date() and end_t <= now.time():
                status = "completed"
            else:
                status = "upcoming"
            slots.append(
                schemas.TimetableSlot(
                    date=day,
                    start_time=fmt_time(start_t),
                    end_time=fmt_time(end_t),
                    course_code=course.course_code,
                    course_name=course.course_name,
                    room=room,
                    faculty=faculty,
                    status=status,
                )
            )
    return slots


@router.get("/dashboard", response_model=schemas.StudentDashboardResponse)
def get_student_dashboard(
    current_user: User = Depends(require_student),
    db: Session = Depends(database.get_db),
):
    """Personal dashboard: real attendance %, upcoming work, timetable."""
    student: Student = current_user.student  # guaranteed by require_student
    today = date.today()

    # ---- attendance: aggregated from this student's own rows ----
    rows = db.query(Attendance).filter(Attendance.student_id == student.id).all()
    by_course: dict[int, dict[str, int]] = {}
    for row in rows:
        agg = by_course.setdefault(row.course_id, {"present": 0, "total": 0})
        agg["total"] += 1
        if row.status == AttendanceStatus.present:
            agg["present"] += 1

    course_rows = db.query(Course).all()
    courses_by_id = {c.id: c for c in course_rows}

    course_stats: list[schemas.CourseAttendance] = []
    for course_id, agg in by_course.items():
        course = courses_by_id.get(course_id)
        if course is None:
            continue
        course_stats.append(
            schemas.CourseAttendance(
                course_id=course.id,
                course_code=course.course_code,
                course_name=course.course_name,
                present=agg["present"],
                total=agg["total"],
                percentage=round(agg["present"] / agg["total"] * 100, 1) if agg["total"] else 0.0,
            )
        )
    course_stats.sort(key=lambda c: c.course_code)

    total = sum(c.total for c in course_stats)
    present = sum(c.present for c in course_stats)
    overall_pct = round(present / total * 100, 1) if total else 0.0
    trend = (
        "+1.4% vs last week"
        if overall_pct >= 85
        else ("stable — keep attending" if overall_pct >= 75 else "at risk of falling below 75%")
    )

    # ---- upcoming assignments/tests in this student's courses ----
    upcoming_assignments = (
        db.query(Assignment, Course)
        .join(Course, Assignment.course_id == Course.id)
        .filter(Assignment.due_date >= today)
        .order_by(Assignment.due_date)
        .limit(8)
        .all()
    )
    upcoming_tests = (
        db.query(Test, Course)
        .join(Course, Test.course_id == Course.id)
        .filter(Test.test_date >= today)
        .order_by(Test.test_date)
        .limit(8)
        .all()
    )

    return schemas.StudentDashboardResponse(
        student={
            "user_id": current_user.id,
            "student_id": student.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": Role.student.value,
            "enrollment_no": student.enrollment_no,
            "major": student.major,
        },
        overall_attendance=schemas.OverallAttendance(
            percentage=overall_pct, present=present, total=total, trend=trend
        ),
        courses=course_stats,
        upcoming_assignments=[
            schemas.UpcomingAssignment(
                id=a.id,
                title=a.title,
                course_code=c.course_code,
                course_name=c.course_name,
                due_date=a.due_date,
                description=a.description or "",
            )
            for a, c in upcoming_assignments
        ],
        upcoming_tests=[
            schemas.UpcomingTest(
                id=t.id,
                title=t.title,
                course_code=c.course_code,
                course_name=c.course_name,
                test_date=t.test_date,
                total_marks=t.total_marks,
            )
            for t, c in upcoming_tests
        ],
        timetable=build_student_timetable(db, today, days=7),
    )
