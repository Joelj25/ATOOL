"""Campus API: mocked events, clubs and notices."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from deps import get_current_user
from models import User

router = APIRouter(prefix="/api/campus", tags=["campus"])


class CampusEvent(BaseModel):
    title: str
    date: str
    location: str
    tag: str


class Club(BaseModel):
    name: str
    members: int
    category: str
    meeting: str


class Notice(BaseModel):
    title: str
    posted: str
    priority: str  # "high" | "normal"


class CampusResponse(BaseModel):
    events: list[CampusEvent]
    clubs: list[Club]
    notices: list[Notice]


@router.get("", response_model=CampusResponse)
def get_campus(current_user: User = Depends(get_current_user)):
    today = date.today()
    in_days = lambda n: (today + timedelta(days=n)).strftime("%b %d")
    ago = lambda n: (today - timedelta(days=n)).strftime("%b %d")

    return CampusResponse(
        events=[
            CampusEvent(title="TechnoVision 2026 — Annual Tech Fest", date=in_days(5), location="Main Auditorium", tag="Fest"),
            CampusEvent(title="Hackathon: AI for Campus", date=in_days(9), location="Innovation Lab", tag="Competition"),
            CampusEvent(title="Placement Readiness Workshop", date=in_days(3), location="Seminar Hall B", tag="Workshop"),
            CampusEvent(title="Inter-College Football Finals", date=in_days(7), location="Sports Complex", tag="Sports"),
        ],
        clubs=[
            Club(name="Coding Club", members=214, category="Technology", meeting="Wed 4 PM"),
            Club(name="Robotics Society", members=158, category="Engineering", meeting="Fri 3 PM"),
            Club(name="Literary Circle", members=97, category="Arts", meeting="Tue 5 PM"),
            Club(name="Music Collective", members=132, category="Arts", meeting="Thu 4:30 PM"),
            Club(name="Entrepreneurship Cell", members=176, category="Business", meeting="Sat 11 AM"),
            Club(name="Photography Club", members=88, category="Arts", meeting="Mon 5 PM"),
        ],
        notices=[
            Notice(title="End-semester examination schedule released", posted=ago(1), priority="high"),
            Notice(title="Library extended hours during exam month", posted=ago(2), priority="normal"),
            Notice(title="Scholarship applications close this Friday", posted=ago(3), priority="high"),
            Notice(title="Campus wifi maintenance on Sunday, 2–6 AM", posted=ago(4), priority="normal"),
        ],
    )
