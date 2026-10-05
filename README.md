# ATOOL — AI Campus OS (MVP)

AI-powered campus operating system. **FastAPI + SQLAlchemy (SQLite)** backend, **Next.js (App Router) + Tailwind CSS** frontend, **JWT** auth with role-based access control (`student` | `faculty`).

## Structure

```
atool/
├── backend/
│   ├── main.py          # FastAPI app, CORS, routers, startup seeding
│   ├── database.py      # SQLAlchemy engine/session (SQLite → PostgreSQL-ready)
│   ├── models.py        # User, Student, Faculty, Course, Attendance, Assignment, Test
│   ├── schemas.py       # Pydantic request/response contracts
│   ├── security.py      # bcrypt hashing + JWT issue/verify (user_id/email/role/name claims)
│   ├── deps.py          # get_current_user + require_student / require_faculty (RBAC)
│   ├── auth.py          # /auth/login, /auth/register, /auth/me
│   ├── student.py       # /api/student/dashboard (real attendance %, upcoming work, timetable)
│   ├── faculty.py       # /api/faculty/* (overview, students, attendance, assignments)
│   ├── campus.py        # /api/campus (events, clubs, notices)
│   ├── chat.py          # /api/chat (rule-based assistant on real data)
│   ├── seed.py          # realistic dummy data (idempotent)
│   └── requirements.txt
└── frontend/
    ├── package.json
    └── src/
        ├── app/
        │   ├── login/page.tsx            # role-aware login + demo quick-login buttons
        │   ├── (app)/layout.tsx          # client wrapper (ssr:false) around the shell
        │   ├── (app)/AppShell.tsx        # auth guard + collapsible sidebar state
        │   ├── (app)/dashboard/page.tsx  # renders Student or Faculty dashboard by role
        │   ├── (app)/students/page.tsx   # faculty: student directory
        │   ├── (app)/courses/page.tsx    # student: courses + attendance
        │   ├── (app)/schedule/page.tsx   # role-aware schedule/deadlines
        │   └── globals.css
        ├── components/
        │   ├── sidebar.tsx               # collapsible sidebar, role-based nav items
        │   ├── StudentDashboard.tsx      # personalized metrics, tabs, week timetable
        │   ├── FacultyDashboard.tsx      # stats, action cards + modals
        │   └── ai-chat-widget.tsx        # assistant wrapper (UI only, no LLM yet)
        └── lib/{api.ts, auth.ts}         # typed API client + localStorage auth
```

## Run it

### 1. Backend (port 8000)

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash (cmd: .venv\Scripts\activate.bat)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On first boot it creates `atool.db` and seeds: 1 faculty + 5 students, 4 courses, ~6 weeks of attendance, assignments and tests.

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** → redirects to `/login`. Use the **Demo Student** / **Demo Faculty** buttons or the credentials below.

### Demo credentials

| Role    | Email                | Password      |
| ------- | -------------------- | ------------- |
| Student | `student@atool.edu`  | `password123` |
| Faculty | `faculty@atool.edu`  | `password123` |

(The seeded classmates `priya@atool.edu`, `rohan@atool.edu`, `sara@atool.edu`, `dev@atool.edu` use the same password — handy for testing per-student data.)

## API quick reference

| Method | Path                        | Auth     | Purpose                                              |
| ------ | --------------------------- | -------- | ---------------------------------------------------- |
| POST   | `/auth/login`               | –        | Verify credentials → JWT (`user_id`,`email`,`role`,`name`) + user object |
| POST   | `/auth/register`            | –        | Create account (student/faculty), returns JWT        |
| GET    | `/auth/me`                  | JWT      | Current user summary                                 |
| GET    | `/api/student/dashboard`    | student  | Real attendance %, courses, upcoming assignments/tests, week timetable |
| GET    | `/api/faculty/overview`     | faculty  | Course stats, totals, upcoming deadlines, recent attendance |
| GET    | `/api/faculty/students-list`| faculty  | All students (dropdown source)                       |
| POST   | `/api/faculty/students`     | faculty  | Add student (creates User + Student)                 |
| POST   | `/api/faculty/attendance`   | faculty  | Mark attendance (upsert per student/course/date)     |
| POST   | `/api/faculty/assignments`  | faculty  | Create assignment **or** test (`type` field)         |
| GET    | `/api/faculty/courses`      | faculty  | Courses taught by the logged-in faculty              |
| GET    | `/api/campus`               | JWT      | Events, clubs and notices                            |
| POST   | `/api/chat`                 | JWT      | Rule-based assistant (attendance/timetable/assignments/tests) |
| GET    | `/docs`                     | –        | Interactive Swagger UI                               |

Non-owning roles get `403` (e.g. a student token on `/api/faculty/*`).

## Notes

- **PostgreSQL swap:** change `SQLALCHEMY_DATABASE_URL` in `backend/database.py` and install `psycopg[binary]` — models are unchanged.
- **CORS:** locked to `http://localhost:3000` in `backend/main.py`.
- **Data flow:** faculty actions (add student / mark attendance / create work) write straight to SQLite — the affected student sees the changes on their next dashboard load.
- **AI Chat:** the assistant answers attendance/timetable/assignment questions from live data via a rule-based handler in `backend/chat.py` — swap that handler for an LLM call when ready.
- Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to point the client at a different backend URL.
