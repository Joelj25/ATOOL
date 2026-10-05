"""Idempotent DB seeding: demo accounts, courses, 6 weeks of attendance,
assignments and tests — so both dashboards look rich on first launch.

Login credentials (also shown on the login page):
    Student: student@atool.edu / password123
    Faculty: faculty@atool.edu / password123
"""

import random
from datetime import date, timedelta

import database
import models
import security

STUDENT_EMAIL = "student@atool.edu"
FACULTY_EMAIL = "faculty@atool.edu"
DEMO_PASSWORD = "password123"

FACULTY_NAME = "Dr. Ananya Rao"
FACULTY_DEPARTMENT = "Computer Science"

STUDENT_NAME = "Arjun Sharma"
STUDENT_ENROLLMENT = "ENR2023-0417"
STUDENT_MAJOR = "B.Tech Computer Science"

# Extra classmates so faculty views (student lists, attendance averages) are rich.
EXTRA_STUDENTS = [
    ("Priya Nair", "priya@atool.edu", "ENR2023-0231", "B.Tech Computer Science"),
    ("Rohan Verma", "rohan@atool.edu", "ENR2023-0512", "B.Tech Information Technology"),
    ("Sara Khan", "sara@atool.edu", "ENR2023-0089", "B.Tech Computer Science"),
    ("Dev Patel", "dev@atool.edu", "ENR2023-0776", "B.Tech Electronics"),
]

# (course_code, course_name)
COURSES = [
    ("CS301", "Data Structures"),
    ("CS302", "Operating Systems"),
    ("MA201", "Discrete Mathematics"),
    ("HS105", "Technical Communication"),
]

# Weekly timetable template (Mon=0 .. Fri=4): (code, start, end, room, faculty)
TIMETABLE = {
    0: [("CS301", (10, 0), (11, 0), "CS-Lab 2"), ("MA201", (11, 15), (12, 15), "B-204")],
    1: [("CS302", (9, 0), (10, 0), "B-301"), ("HS105", (11, 15), (12, 15), "A-101")],
    2: [("MA201", (10, 0), (11, 0), "B-204"), ("CS301", (14, 0), (15, 0), "CS-Lab 2")],
    3: [("CS302", (9, 0), (10, 0), "B-301"), ("CS301", (11, 15), (12, 15), "CS-Lab 2")],
    4: [("HS105", (10, 0), (11, 0), "A-101"), ("MA201", (14, 0), (15, 0), "B-204")],
}


def seed_if_empty() -> None:
    db = database.SessionLocal()
    try:
        if db.query(models.User).filter(models.User.email == STUDENT_EMAIL).first():
            return  # already seeded

        # ---- faculty user + profile ----
        faculty_user = models.User(
            email=FACULTY_EMAIL,
            password_hash=security.hash_password(DEMO_PASSWORD),
            role=models.Role.faculty,
            name=FACULTY_NAME,
        )
        db.add(faculty_user)
        db.flush()

        faculty = models.Faculty(user_id=faculty_user.id, department=FACULTY_DEPARTMENT)
        db.add(faculty)
        db.flush()

        # ---- courses taught by the demo faculty ----
        course_rows = {
            code: models.Course(course_code=code, course_name=name, faculty_id=faculty.id)
            for code, name in COURSES
        }
        db.add_all(course_rows.values())
        db.flush()

        # ---- demo student + classmates ----
        def make_student(name: str, email: str, enr: str, major: str) -> models.Student:
            u = models.User(
                email=email,
                password_hash=security.hash_password(DEMO_PASSWORD),
                role=models.Role.student,
                name=name,
            )
            db.add(u)
            db.flush()
            s = models.Student(user_id=u.id, enrollment_no=enr, major=major)
            db.add(s)
            db.flush()
            return s

        demo_student = make_student(STUDENT_NAME, STUDENT_EMAIL, STUDENT_ENROLLMENT, STUDENT_MAJOR)
        classmates = [make_student(*row) for row in EXTRA_STUDENTS]

        # ---- ~6 weeks of attendance for every student, ending yesterday ----
        rng = random.Random(42)
        # Per-student presence probability → varied attendance percentages.
        presence_p = {demo_student.id: 0.87}
        for i, s in enumerate(classmates):
            presence_p[s.id] = [0.93, 0.78, 0.84, 0.69][i]

        today = date.today()
        for offset in range(1, 43):
            day = today - timedelta(days=offset)
            if day.weekday() not in TIMETABLE:
                continue
            for code, _start, _end, _room in TIMETABLE[day.weekday()]:
                course = course_rows[code]
                for student in [demo_student, *classmates]:
                    status = (
                        models.AttendanceStatus.present
                        if rng.random() < presence_p[student.id]
                        else models.AttendanceStatus.absent
                    )
                    db.add(
                        models.Attendance(
                            student_id=student.id,
                            course_id=course.id,
                            date=day,
                            status=status,
                        )
                    )

        # ---- assignments due soon ----
        assignments = [
            ("AVL Tree implementation", "CS301", 2, "Implement insert + rotations for an AVL tree; submit code and a short report."),
            ("Banker's Algorithm case study", "CS302", 4, "Analyze deadlock avoidance with a worked example (5 processes, 3 resources)."),
            ("Graph theory problem set 3", "MA201", 6, "Euler circuits, coloring, and Dijkstra proofs — see the PDF on the portal."),
            ("Technical blog draft", "HS105", 9, "Draft a 600-word blog post on an emerging technology trend."),
        ]
        for title, code, due_in, desc in assignments:
            db.add(
                models.Assignment(
                    course_id=course_rows[code].id,
                    title=title,
                    due_date=today + timedelta(days=due_in),
                    description=desc,
                )
            )

        # ---- tests scheduled ahead ----
        tests = [
            ("Midterm 1", "CS301", 5, 30),
            ("Midterm 1", "CS302", 8, 30),
            ("Quiz 2", "MA201", 3, 10),
            ("Presentation assessment", "HS105", 12, 20),
        ]
        for title, code, in_days, marks in tests:
            db.add(
                models.Test(
                    course_id=course_rows[code].id,
                    title=title,
                    test_date=today + timedelta(days=in_days),
                    total_marks=marks,
                )
            )

        db.commit()
        print(f"[seed] Demo data created. Student: {STUDENT_EMAIL} / {DEMO_PASSWORD} · Faculty: {FACULTY_EMAIL} / {DEMO_PASSWORD}")
    finally:
        db.close()
