"""AI tool registry for the ATOOL agent.

Each tool is defined twice: a Pydantic `ToolDefinition` (serialized to the
standard OpenAI `tools` payload for the LLM) and a Python executor that runs
against the real SQLite data. To add a new tool (e.g. `find_room`), append a
ToolDefinition and an executor here — the chat loop picks both up
automatically, no other file changes needed.
"""

import math
from datetime import date
from typing import Any, Callable, Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from models import Attendance, AttendanceStatus, Student
from student import TIMETABLE, build_student_timetable


# ---------------------------------------------------------------- schemas
class ToolProperty(BaseModel):
    """One JSON-schema property of a tool's arguments."""

    type: Literal["string", "integer", "number", "boolean"] = "string"
    description: str = ""
    enum: list[str] | None = None


class ToolParameters(BaseModel):
    """JSON-schema object describing a tool's arguments."""

    type: Literal["object"] = "object"
    properties: dict[str, ToolProperty] = Field(default_factory=dict)
    required: list[str] = Field(default_factory=list)


class ToolDefinition(BaseModel):
    """A callable tool exposed to the LLM."""

    name: str
    description: str
    parameters: ToolParameters

    def to_openai_schema(self) -> dict:
        """Standard OpenAI function-calling format (Groq/Gemini/Ollama compatible)."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters.model_dump(exclude_none=True),
            },
        }


class ToolError(Exception):
    """Raised by an executor when its arguments are invalid; surfaced to the LLM."""


Executor = Callable[..., dict[str, Any]]

ATTENDANCE_REQUIREMENT = 0.75  # 75% minimum to sit end-term exams


# ------------------------------------------------------- shared helpers
def _self_or_authenticated(student: Student, student_id: int | None) -> Student:
    """Security: a tool may only read data for the signed-in student.

    The LLM receives the schema with `student_id`, but any value other than
    the authenticated student's own id is rejected (prevents IDOR if the
    model hallucinates or a user prompt-injects another id).
    """
    if student_id is not None and student_id != student.id:
        raise ToolError(
            "You may only view attendance for the signed-in student. "
            "Call the tool again without student_id."
        )
    return student


def _serialize_slot(slot) -> dict:
    return {
        "date": slot.date.isoformat(),
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "course_code": slot.course_code,
        "course_name": slot.course_name,
        "room": slot.room,
        "faculty": slot.faculty,
        "status": slot.status,
    }


# ---------------------------------------------------------- tools
def get_attendance_status(
    db: Session, student: Student, student_id: int | None = None
) -> dict:
    """Real attendance numbers: total held, attended, and how safe it is to skip."""
    target = _self_or_authenticated(student, student_id)
    rows = db.query(Attendance).filter(Attendance.student_id == target.id).all()

    total_held = len(rows)
    total_attended = sum(1 for r in rows if r.status == AttendanceStatus.present)
    percentage = (
        round(total_attended / total_held * 100, 1) if total_held else 0.0
    )

    if total_held == 0:
        can_skip, must_attend = 0, 0
    elif percentage >= ATTENDANCE_REQUIREMENT * 100:
        # Skipping k more classes keeps pct >= 75% while k <= P/0.75 - T.
        can_skip = int(math.floor(total_attended / ATTENDANCE_REQUIREMENT - total_held))
        must_attend = 0
    else:
        # Attend n classes in a row (all present) to climb back to 75%:
        # (P + n) / (T + n) >= 0.75  =>  n >= (0.75T - P) / 0.25
        must_attend = int(math.ceil((ATTENDANCE_REQUIREMENT * total_held - total_attended) / 0.25))
        can_skip = 0

    # Per-course breakdown so the model can flag the weakest subject.
    per_course: dict[int, dict[str, int]] = {}
    for row in rows:
        agg = per_course.setdefault(row.course_id, {"present": 0, "total": 0})
        agg["total"] += 1
        if row.status == AttendanceStatus.present:
            agg["present"] += 1
    courses = {c.id: c for c in db.query(models.Course).all()}
    breakdown = [
        {
            "course_code": courses[cid].course_code,
            "course_name": courses[cid].course_name,
            "attended": agg["present"],
            "held": agg["total"],
            "percentage": round(agg["present"] / agg["total"] * 100, 1) if agg["total"] else 0.0,
        }
        for cid, agg in sorted(per_course.items())
    ]

    return {
        "student": {"name": target.user.name, "enrollment_no": target.enrollment_no},
        "attendance_requirement": "75%",
        "total_held": total_held,
        "total_attended": total_attended,
        "percentage": percentage,
        "safe_to_skip": can_skip,        # classes you may miss and still be >= 75%
        "must_attend_in_a_row": must_attend,  # consecutive classes to get back >= 75%
        "per_course": breakdown,
    }


def get_timetable(db: Session, student: Student, days: int = 3) -> dict:
    """The signed-in student's classes for the next `days` days (max 7)."""
    days = max(1, min(int(days), 7))
    slots = build_student_timetable(db, date.today(), days=days)
    return {"days_ahead": days, "slots": [_serialize_slot(s) for s in slots]}


# ---------------------------------------------------------- registry
TOOL_DEFINITIONS: list[ToolDefinition] = [
    ToolDefinition(
        name="get_attendance_status",
        description=(
            "Fetch the signed-in student's real attendance record from the campus "
            "database: total classes held, total attended, overall percentage, how "
            "many future classes can safely be skipped while staying above the 75% "
            "requirement, and a per-course breakdown. Use this for ANY question "
            "about attendance, bunking, or exam eligibility."
        ),
        parameters=ToolParameters(
            properties={
                "student_id": ToolProperty(
                    type="integer",
                    description="Optional. The signed-in student's id — omit it to use the caller's own record.",
                )
            }
        ),
    ),
    ToolDefinition(
        name="get_timetable",
        description=(
            "Fetch the signed-in student's upcoming classes for the next few days "
            "from the campus timetable: date, times, course, room and faculty. Use "
            "this for questions about schedules, next class, or where to be."
        ),
        parameters=ToolParameters(
            properties={
                "days": ToolProperty(
                    type="integer",
                    description="How many days ahead to include (1-7). Defaults to 3.",
                )
            }
        ),
    ),
]

TOOL_EXECUTORS: dict[str, Executor] = {
    "get_attendance_status": get_attendance_status,
    "get_timetable": get_timetable,
}


def openai_tools_payload() -> list[dict]:
    """Tools in standard OpenAI `tools` format for the chat/completions call."""
    return [t.to_openai_schema() for t in TOOL_DEFINITIONS]


def run_tool(name: str, db: Session, student: Student, args: dict) -> dict:
    """Execute a registered tool; unknown names raise ToolError."""
    executor = TOOL_EXECUTORS.get(name)
    if executor is None:
        raise ToolError(f"Unknown tool '{name}'. Available: {sorted(TOOL_EXECUTORS)}")
    try:
        return executor(db, student, **args)
    except ToolError:
        raise
    except TypeError as exc:
        raise ToolError(f"Bad arguments for '{name}': {exc}") from exc
