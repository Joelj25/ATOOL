"""Pydantic schemas (request/response contracts) for ATOOL API."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import AttendanceStatus, Role


# ---------------------------------------------------------------- auth
class UserOut(BaseModel):
    """User summary object returned alongside the JWT."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    email: EmailStr
    role: Role
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ------------------------------------------------------- faculty actions
class AddStudentRequest(BaseModel):
    """POST /api/faculty/students — creates User + Student records."""

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    enrollment_no: str = Field(min_length=3, max_length=40)
    major: str = Field(default="Undeclared", max_length=120)
    password: str = Field(default="password123", min_length=6, max_length=72)


class MarkAttendanceRequest(BaseModel):
    """POST /api/faculty/attendance — upserts one attendance row."""

    student_id: int
    course_id: int
    date: date
    status: AttendanceStatus


class CreateAssessmentRequest(BaseModel):
    """POST /api/faculty/assignments — create an assignment OR a test."""

    type: str = Field(pattern="^(assignment|test)$")
    title: str = Field(min_length=2, max_length=200)
    course_id: int
    due_date: date
    description: str = Field(default="", max_length=2000)
    total_marks: int = Field(default=100, ge=1, le=1000)


# ------------------------------------------------- faculty overview etc.
class CourseStat(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    students: int
    assignments: int
    tests: int
    avg_attendance: float


class RecentSubmission(BaseModel):
    kind: str  # "assignment" | "test"
    title: str
    course_code: str
    date: date


class FacultyOverview(BaseModel):
    faculty: dict
    totals: dict
    courses: list[CourseStat]
    upcoming: list[RecentSubmission]
    recent_attendance: list[dict]


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_code: str
    course_name: str


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    email: str
    enrollment_no: str
    major: str


# ------------------------------------------------------ student dashboard
class CourseAttendance(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    present: int
    total: int
    percentage: float


class OverallAttendance(BaseModel):
    percentage: float
    present: int
    total: int
    trend: str


class TimetableSlot(BaseModel):
    date: date
    start_time: str
    end_time: str
    course_code: str
    course_name: str
    room: str
    faculty: str
    status: str  # "completed" | "upcoming"


class UpcomingAssignment(BaseModel):
    id: int
    title: str
    course_code: str
    course_name: str
    due_date: date
    description: str


class UpcomingTest(BaseModel):
    id: int
    title: str
    course_code: str
    course_name: str
    test_date: date
    total_marks: int


class StudentDashboardResponse(BaseModel):
    student: dict
    overall_attendance: OverallAttendance
    courses: list[CourseAttendance]
    upcoming_assignments: list[UpcomingAssignment]
    upcoming_tests: list[UpcomingTest]
    timetable: list[TimetableSlot]
