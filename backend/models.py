"""Core database models for ATOOL.

Schema per spec:
    User       — login identity (student | faculty)
    Student    — student profile (1:1 with User)
    Faculty    — faculty profile (1:1 with User)
    Course     — taught by a Faculty
    Attendance — per student / course / day
    Assignment — coursework due per course
    Test       — scheduled exams per course
"""

import enum
from datetime import date

from sqlalchemy import (
    Date,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Role(str, enum.Enum):
    student = "student"
    faculty = "faculty"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    student: Mapped["Student | None"] = relationship(back_populates="user", uselist=False)
    faculty: Mapped["Faculty | None"] = relationship(back_populates="user", uselist=False)

    @property
    def user_id(self) -> int:
        """Alias so `UserOut.user_id` can be read straight from the ORM object."""
        return self.id


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    enrollment_no: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    major: Mapped[str] = mapped_column(String(120), nullable=False, default="Undeclared")

    user: Mapped[User] = relationship(back_populates="student")
    attendance: Mapped[list["Attendance"]] = relationship(back_populates="student")


class Faculty(Base):
    __tablename__ = "faculty"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="General")

    user: Mapped[User] = relationship(back_populates="faculty")
    courses: Mapped[list["Course"]] = relationship(back_populates="faculty_member")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    course_name: Mapped[str] = mapped_column(String(120), nullable=False)
    faculty_id: Mapped[int | None] = mapped_column(
        ForeignKey("faculty.id"), nullable=True, index=True
    )

    faculty_member: Mapped["Faculty | None"] = relationship(back_populates="courses")
    attendance: Mapped[list["Attendance"]] = relationship(back_populates="course")
    assignments: Mapped[list["Assignment"]] = relationship(back_populates="course")
    tests: Mapped[list["Test"]] = relationship(back_populates="course")


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("student_id", "course_id", "date", name="uq_attendance_student_course_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True, nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus), default=AttendanceStatus.present, nullable=False
    )

    student: Mapped[Student] = relationship(back_populates="attendance")
    course: Mapped[Course] = relationship(back_populates="attendance")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    course: Mapped[Course] = relationship(back_populates="assignments")


class Test(Base):
    __tablename__ = "tests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    test_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    course: Mapped[Course] = relationship(back_populates="tests")
