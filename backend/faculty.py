"""Faculty endpoints: overview, student management, attendance, assessments.

All routes are RBAC-guarded to the "faculty" role. Writes go straight to
SQLite, so a student logging in immediately sees the changes.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import database
import schemas
import security
from deps import require_faculty
from models import (
    Assignment,
    Attendance,
    AttendanceStatus,
    Course,
    Faculty,
    Role,
    Student,
    Test,
    User,
)

router = APIRouter(prefix="/api/faculty", tags=["faculty"])


@router.get("/overview", response_model=schemas.FacultyOverview)
def get_overview(current_user: User = Depends(require_faculty), db: Session = Depends(database.get_db)):
    """Course stats, total students, and recent/upcoming assessments."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if faculty is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No faculty profile linked to this account.")

    courses = db.query(Course).filter(Course.faculty_id == faculty.id).order_by(Course.course_code).all()
    total_students = db.query(Student).count()

    course_stats: list[schemas.CourseStat] = []
    for course in courses:
        enrolled = db.query(Attendance.student_id).filter(Attendance.course_id == course.id).distinct().count()
        # Average attendance across all rows recorded for this course.
        total_rows = db.query(Attendance).filter(Attendance.course_id == course.id).count()
        present_rows = (
            db.query(Attendance)
            .filter(Attendance.course_id == course.id, Attendance.status == AttendanceStatus.present)
            .count()
        )
        avg_attendance = round(present_rows / total_rows * 100, 1) if total_rows else 0.0

        course_stats.append(
            schemas.CourseStat(
                course_id=course.id,
                course_code=course.course_code,
                course_name=course.course_name,
                students=enrolled,
                assignments=db.query(Assignment).filter(Assignment.course_id == course.id).count(),
                tests=db.query(Test).filter(Test.course_id == course.id).count(),
                avg_attendance=avg_attendance,
            )
        )

    today = date.today()
    upcoming_assignments = (
        db.query(Assignment, Course)
        .join(Course, Assignment.course_id == Course.id)
        .filter(Assignment.due_date >= today, Course.faculty_id == faculty.id)
        .order_by(Assignment.due_date)
        .limit(6)
        .all()
    )
    upcoming_tests = (
        db.query(Test, Course)
        .join(Course, Test.course_id == Course.id)
        .filter(Test.test_date >= today, Course.faculty_id == faculty.id)
        .order_by(Test.test_date)
        .limit(6)
        .all()
    )
    upcoming = [
        schemas.RecentSubmission(kind="assignment", title=a.title, course_code=c.course_code, date=a.due_date)
        for a, c in upcoming_assignments
    ] + [
        schemas.RecentSubmission(kind="test", title=t.title, course_code=c.course_code, date=t.test_date)
        for t, c in upcoming_tests
    ]
    upcoming.sort(key=lambda r: r.date)

    recent_attendance_rows = (
        db.query(Attendance, Student, Course, User)
        .join(Student, Attendance.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .join(Course, Attendance.course_id == Course.id)
        .order_by(Attendance.date.desc(), Attendance.id.desc())
        .limit(8)
        .all()
    )
    recent_attendance = [
        {
            "student_name": user.name,
            "course_code": course.course_code,
            "date": att.date.isoformat(),
            "status": att.status.value,
        }
        for att, student, course, user in recent_attendance_rows
    ]

    return schemas.FacultyOverview(
        faculty={"name": current_user.name, "department": faculty.department, "email": current_user.email},
        totals={
            "courses": len(courses),
            "students": total_students,
            "assignments": db.query(Assignment).join(Course).filter(Course.faculty_id == faculty.id).count(),
            "tests": db.query(Test).join(Course).filter(Course.faculty_id == faculty.id).count(),
        },
        courses=course_stats,
        upcoming=upcoming,
        recent_attendance=recent_attendance,
    )


@router.get("/students-list", response_model=list[schemas.StudentOut])
def students_list(current_user: User = Depends(require_faculty), db: Session = Depends(database.get_db)):
    """All students — used to populate dropdowns."""
    rows = (
        db.query(Student, User)
        .join(User, Student.user_id == User.id)
        .order_by(User.name)
        .all()
    )
    return [
        schemas.StudentOut(
            id=student.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            enrollment_no=student.enrollment_no,
            major=student.major,
        )
        for student, user in rows
    ]


@router.post("/students", response_model=schemas.StudentOut, status_code=status.HTTP_201_CREATED)
def add_student(
    payload: schemas.AddStudentRequest,
    current_user: User = Depends(require_faculty),
    db: Session = Depends(database.get_db),
):
    """Add a new student: creates both the User and Student records."""
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists.")
    if db.query(Student).filter(Student.enrollment_no == payload.enrollment_no).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A student with this enrollment number already exists.")

    user = User(
        email=email,
        password_hash=security.hash_password(payload.password),
        role=Role.student,
        name=payload.name.strip(),
    )
    db.add(user)
    db.flush()

    student = Student(user_id=user.id, enrollment_no=payload.enrollment_no.strip(), major=payload.major)
    db.add(student)
    db.commit()
    db.refresh(student)
    db.refresh(user)

    return schemas.StudentOut(
        id=student.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        enrollment_no=student.enrollment_no,
        major=student.major,
    )


@router.post("/attendance", response_model=dict, status_code=status.HTTP_201_CREATED)
def mark_attendance(
    payload: schemas.MarkAttendanceRequest,
    current_user: User = Depends(require_faculty),
    db: Session = Depends(database.get_db),
):
    """Mark attendance for a student in a course for a specific date (upsert)."""
    student = db.get(Student, payload.student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")
    course = db.get(Course, payload.course_id)
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found.")

    row = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == payload.student_id,
            Attendance.course_id == payload.course_id,
            Attendance.date == payload.date,
        )
        .first()
    )
    if row is None:
        row = Attendance(
            student_id=payload.student_id,
            course_id=payload.course_id,
            date=payload.date,
            status=payload.status,
        )
        db.add(row)
        message = "Attendance recorded."
    else:
        row.status = payload.status  # same day+course+student => update
        message = "Existing record updated."

    db.commit()
    return {
        "ok": True,
        "message": message,
        "record": {
            "student_id": payload.student_id,
            "course_id": payload.course_id,
            "date": payload.date.isoformat(),
            "status": payload.status.value,
        },
    }


@router.post("/assignments", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_assessment(
    payload: schemas.CreateAssessmentRequest,
    current_user: User = Depends(require_faculty),
    db: Session = Depends(database.get_db),
):
    """Create a new assignment OR test for a course (`type` selects which)."""
    course = db.get(Course, payload.course_id)
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found.")

    if payload.type == "assignment":
        item = Assignment(
            course_id=course.id,
            title=payload.title.strip(),
            due_date=payload.due_date,
            description=payload.description,
        )
        db.add(item)
        db.commit()
        return {"ok": True, "message": f"Assignment '{item.title}' created for {course.course_code}.", "id": item.id}

    item = Test(
        course_id=course.id,
        title=payload.title.strip(),
        test_date=payload.due_date,
        total_marks=payload.total_marks,
    )
    db.add(item)
    db.commit()
    return {"ok": True, "message": f"Test '{item.title}' created for {course.course_code}.", "id": item.id}


@router.get("/courses", response_model=list[schemas.CourseOut])
def faculty_courses(current_user: User = Depends(require_faculty), db: Session = Depends(database.get_db)):
    """Courses taught by the logged-in faculty — for dropdowns."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    if faculty is None:
        return []
    return db.query(Course).filter(Course.faculty_id == faculty.id).order_by(Course.course_code).all()
