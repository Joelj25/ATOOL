"""ATOOL Campus AI — tool-calling chat agent over `/api/chat`.

Flow per request:
    1. Receive the user message (+ recent history from the client).
    2. Send it to an OpenAI-compatible LLM with the tool schemas from
       ai_tools.py (Groq / Gemini / Ollama — see ai_config.py).
    3. If the LLM emits tool_calls, execute the matching Python tools
       against the real SQLite campus data, append the JSON results as
       `role="tool"` messages, and call the LLM again.
    4. Return the final human-readable text to the frontend.

Graceful degradation: with no LLM_API_KEY (or if the LLM is unreachable),
the endpoint falls back to the built-in rule-based assistant so the demo
still answers with real data.
"""

import json
import logging
from datetime import date, datetime
from typing import Literal

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

import ai_config
import database
import student as student_api
from ai_tools import ToolError, openai_tools_payload, run_tool
from deps import get_current_user
from models import Assignment, Role, Student, Test, User

logger = logging.getLogger("atool.chat")

router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_TOOL_ROUNDS = 4  # safety cap on the call-a-tool -> call-LLM-again loop
HISTORY_WINDOW = 8  # how many past turns the client may supply as context

SYSTEM_PROMPT = (
    "You are the ATOOL Campus AI. You help students manage their academic life. "
    "Always use the provided tools to fetch real data before answering questions "
    "about attendance, timetables, or campus locations. Keep answers concise, "
    "conversational, and helpful."
)


# ---------------------------------------------------------------- schemas
class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[HistoryItem] = []


class ChatResponse(BaseModel):
    reply: str


class LLMError(Exception):
    """Any failure talking to the LLM provider."""


# ---------------------------------------------------------------- LLM call
async def _call_llm(messages: list[dict]) -> dict:
    """One OpenAI-format /chat/completions call; returns the assistant message."""
    cfg = ai_config.settings
    body = {
        "model": cfg.model,
        "messages": messages,
        "temperature": cfg.temperature,
    }
    tools = openai_tools_payload()
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"

    try:
        async with httpx.AsyncClient(timeout=cfg.timeout_seconds) as client:
            resp = await client.post(
                f"{cfg.base_url}/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {cfg.api_key}"},
            )
    except httpx.HTTPError as exc:
        raise LLMError(f"LLM unreachable: {exc}") from exc

    if resp.status_code != 200:
        raise LLMError(f"LLM HTTP {resp.status_code}: {resp.text[:200]}")

    try:
        return resp.json()["choices"][0]["message"]
    except (KeyError, IndexError, ValueError) as exc:
        raise LLMError("Malformed LLM response") from exc


# ------------------------------------------------------------- agent loop
async def run_agent(
    user_message: str, history: list[HistoryItem], db: Session, student: Student
) -> str:
    """Tool-calling loop: LLM -> execute tools -> LLM -> final answer."""
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": h.role, "content": h.content} for h in history[-HISTORY_WINDOW:]]
    messages.append({"role": "user", "content": user_message})

    for round_no in range(MAX_TOOL_ROUNDS):
        assistant = await _call_llm(messages)
        tool_calls = assistant.get("tool_calls") or []

        if not tool_calls:
            return assistant.get("content") or "I'm here if you need anything about campus life!"

        # Persist the assistant's tool-call turn before appending results.
        messages.append(
            {
                "role": "assistant",
                "content": assistant.get("content") or "",
                "tool_calls": tool_calls,
            }
        )

        for call in tool_calls:
            fn = call.get("function", {})
            name = fn.get("name", "")
            raw_args = fn.get("arguments") or "{}"
            try:
                args = json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
            except (json.JSONDecodeError, TypeError):
                args = {}

            try:
                result = run_tool(name, db, student, args)
            except ToolError as exc:
                logger.warning("tool '%s' failed: %s", name, exc)
                result = {"error": str(exc)}

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.get("id") or name,
                    "name": name,
                    "content": json.dumps(result, default=str),
                }
            )

    return "I checked a few sources but couldn't finish in time — please ask me again."


# ----------------------------------------------------- rule-based fallback
def _fallback_reply(text: str, user: User, student: Student, db: Session) -> str:
    """Keyword assistant used when no LLM key is configured (real data only)."""
    text = text.lower()

    if any(k in text for k in ["attendance", "present", "absent", "bunk", "skip", "percentage"]):
        from ai_tools import get_attendance_status  # local import avoids cycle

        data = get_attendance_status(db, student)
        pct = data["percentage"]
        lines = [f"Your attendance is **{pct}%** ({data['total_attended']}/{data['total_held']} classes)."]
        if data["safe_to_skip"]:
            lines.append(f"You can still skip **{data['safe_to_skip']}** class(es) and stay above 75%. 😌")
        elif data["must_attend_in_a_row"]:
            lines.append(
                f"⚠️ You are below 75% — attend **{data['must_attend_in_a_row']}** classes in a row to recover."
            )
        return "\n".join(lines)

    if any(k in text for k in ["timetable", "schedule", "next class", "today", "class"]):
        now = datetime.now()
        courses = student_api._course_map(db)
        slots = student_api.TIMETABLE.get(now.date().weekday(), [])
        upcoming = [s for s in slots if s[2] > now.time()]
        if not upcoming:
            return "You have no classes left today. Enjoy the free day! 🎉"
        code, start, _end, room, faculty_name = upcoming[0]
        course = courses.get(code)
        return (
            f"Your next class is **{course.course_name if course else code}** ({code}) "
            f"at {student_api.fmt_time(start)} in {room} with {faculty_name}."
        )

    if any(k in text for k in ["assignment", "homework", "due", "deadline"]):
        items = (
            db.query(Assignment)
            .filter(Assignment.due_date >= date.today())
            .order_by(Assignment.due_date)
            .limit(6)
            .all()
        )
        if not items:
            return "You have no upcoming assignments. 🎉"
        lines = "\n".join(f"• {a.title} — due {a.due_date.strftime('%b %d')}" for a in items)
        return f"You have {len(items)} upcoming assignment(s):\n{lines}"

    if any(k in text for k in ["test", "exam", "quiz", "midterm"]):
        items = (
            db.query(Test)
            .filter(Test.test_date >= date.today())
            .order_by(Test.test_date)
            .limit(6)
            .all()
        )
        if not items:
            return "No tests are scheduled right now."
        lines = "\n".join(f"• {t.title} — {t.test_date.strftime('%b %d')} ({t.total_marks} marks)" for t in items)
        return f"Upcoming tests:\n{lines}"

    if any(k in text for k in ["hi", "hello", "hey"]):
        return f"Hi {user.name.split()[0]}! Ask me about your attendance, timetable, or assignments."

    return (
        "I can help with your **attendance**, **timetable**, **assignments**, and **tests**. "
        "(Running in offline mode — set LLM_API_KEY to enable the full AI agent.)"
    )


# ---------------------------------------------------------------- endpoint
@router.post("", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(database.get_db),
):
    """Campus AI chat. Faculty get an orientation reply (tools are student-scoped)."""
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

    cfg = ai_config.settings
    if not cfg.configured:
        return ChatResponse(reply=_fallback_reply(payload.message, current_user, student, db))

    try:
        reply = await run_agent(payload.message, payload.history, db, student)
        return ChatResponse(reply=reply)
    except LLMError as exc:
        logger.warning("agent falling back: %s", exc)
        return ChatResponse(reply=_fallback_reply(payload.message, current_user, student, db))
