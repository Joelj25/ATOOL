"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  FileText,
  MapPin,
  PenLine,
  RefreshCw,
  User,
} from "lucide-react";
import AiChatWidget from "@/components/ai-chat-widget";
import {
  fetchStudentDashboard,
  type StudentDashboardData,
  type TimetableSlot,
} from "@/lib/api";

type Tab = "courses" | "assignments" | "tests";

export default function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<Tab>("courses");

  // `loading` starts true; setState only fires from async callbacks.
  const load = useCallback(() => {
    fetchStudentDashboard()
      .then(setData)
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) return <SkeletonGrid />;

  if (offline) {
    return (
      <div className="rounded-2xl border border-warning/25 bg-warning/5 p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-warning">
          <AlertTriangle className="h-4 w-4" /> Backend not reachable
        </p>
        <p className="mt-2 text-xs text-muted">
          Start it with <code className="rounded bg-surface-2 px-1.5 py-0.5 text-foreground">uvicorn main:app --port 8000</code>{" "}
          inside <code className="rounded bg-surface-2 px-1.5 py-0.5 text-foreground">backend/</code>, then refresh.
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { overall_attendance: att, student } = data;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Welcome header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {student.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {student.enrollment_no} · {student.major}
        </p>
      </header>

      <div className="space-y-6">
        {/* Metric cards — computed from this student's DB rows */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            icon={<BookOpenCheck className="h-5 w-5" />}
            tint="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            label="My Attendance"
            value={`${att.percentage}%`}
            sub={`${att.present}/${att.total} classes · ${att.trend}`}
          />
          <MetricCard
            icon={<ClipboardList className="h-5 w-5" />}
            tint="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
            label="Upcoming Assignments"
            value={`${data.upcoming_assignments.length}`}
            sub={data.upcoming_assignments[0] ? `Next: ${data.upcoming_assignments[0].title}` : "Nothing due 🎉"}
          />
          <MetricCard
            icon={<PenLine className="h-5 w-5" />}
            tint="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
            label="Upcoming Tests"
            value={`${data.upcoming_tests.length}`}
            sub={data.upcoming_tests[0] ? `Next: ${data.upcoming_tests[0].title}` : "None scheduled"}
          />
        </section>

        {/* Courses + right rail */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3 space-y-6">
            {/* Tabbed lists: courses / assignments / tests */}
            <div>
              <div className="mb-3 flex gap-1 rounded-lg bg-surface-2 p-1 text-sm font-medium w-fit">
                {(
                  [
                    ["courses", "My Courses"],
                    ["assignments", "Assignments"],
                    ["tests", "Tests"],
                  ] as [Tab, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`rounded-md px-3 py-1.5 transition ${
                      tab === key ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "courses" && <CoursesTable courses={data.courses} />}
              {tab === "assignments" && <AssignmentsList items={data.upcoming_assignments} />}
              {tab === "tests" && <TestsList items={data.upcoming_tests} />}
            </div>

            {/* Weekly timetable */}
            <TimetableCard slots={data.timetable} />
          </section>

          {/* Right column: per-course attendance bars */}
          <section className="space-y-6 lg:col-span-2">
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/80">
                <BookOpenCheck className="h-4 w-4 text-success" /> Attendance by Course
              </h2>
              <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                {data.courses.map((c) => (
                  <div key={c.course_id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground/80">{c.course_code}</span>
                      <span className={c.percentage >= 75 ? "text-success" : "text-danger"}>
                        {c.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full ${
                          c.percentage >= 75
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : "bg-gradient-to-r from-red-500 to-orange-400"
                        }`}
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {data.courses.length === 0 && (
                  <p className="text-xs text-faint">No attendance recorded yet.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <AiChatWidget />
    </div>
  );
}

/** Portal-style header: blue underline on the first column, red on the rest. */
function Th({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <th
      className={`border-b-2 px-5 py-3 text-left text-xs font-semibold tracking-wide text-foreground/80 ${
        first ? "border-accent-blue" : "border-accent-red"
      }`}
    >
      {children}
    </th>
  );
}

function CoursesTable({ courses }: { courses: StudentDashboardData["courses"] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface">
          <tr>
            <Th first>Code</Th>
            <Th>Course</Th>
            <Th>Attendance</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {courses.map((c) => (
            <tr key={c.course_id} className="transition hover:bg-surface-2/60">
              <td className="px-5 py-3.5">
                <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                  {c.course_code}
                </span>
              </td>
              <td className="px-5 py-3.5 font-medium text-foreground">{c.course_name}</td>
              <td className="px-5 py-3.5">
                <span className={c.percentage >= 75 ? "font-semibold text-success" : "font-semibold text-danger"}>
                  {c.percentage}%
                </span>
                <span className="ml-2 text-xs text-faint">
                  ({c.present}/{c.total})
                </span>
              </td>
            </tr>
          ))}
          {courses.length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-6 text-center text-faint">
                No attendance records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentsList({ items }: { items: StudentDashboardData["upcoming_assignments"] }) {
  if (items.length === 0) {
    return <EmptyList icon={<FileText className="h-4 w-4" />} text="No upcoming assignments 🎉" />;
  }
  return (
    <div className="space-y-2.5">
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
              <p className="text-[11px] text-faint">{a.course_code} · {a.course_name}</p>
              {a.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{a.description}</p>}
            </div>
            <span className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              due {fmtDate(a.due_date)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TestsList({ items }: { items: StudentDashboardData["upcoming_tests"] }) {
  if (items.length === 0) {
    return <EmptyList icon={<PenLine className="h-4 w-4" />} text="No tests scheduled" />;
  }
  return (
    <div className="space-y-2.5">
      {items.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
            <p className="text-[11px] text-faint">{t.course_code} · {t.course_name}</p>
          </div>
          <span className="ml-3 shrink-0 rounded-lg bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {fmtDate(t.test_date)} · {t.total_marks} marks
          </span>
        </div>
      ))}
    </div>
  );
}

function TimetableCard({ slots }: { slots: TimetableSlot[] }) {
  const grouped = useMemo(() => {
    const byDay = new Map<string, TimetableSlot[]>();
    for (const s of slots) {
      const key = s.date;
      byDay.set(key, [...(byDay.get(key) ?? []), s]);
    }
    return [...byDay.entries()];
  }, [slots]);

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/80">
        <CalendarClock className="h-4 w-4 text-accent" /> Week Ahead
      </h2>
      <div className="space-y-2.5">
        {grouped.map(([day, daySlots]) => (
          <div key={day}>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-faint uppercase">
              {fmtDate(day, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <div className="space-y-2">
              {daySlots.map((slot, i) => (
                <SlotRow key={i} slot={slot} />
              ))}
            </div>
          </div>
        ))}
        {slots.length === 0 && (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-faint">
            No classes scheduled this week.
          </p>
        )}
      </div>
    </div>
  );
}

function SlotRow({ slot }: { slot: TimetableSlot }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3.5 shadow-sm transition hover:border-accent/40">
      <div className="w-20 shrink-0 text-right">
        <p className="text-sm font-semibold text-foreground">{slot.start_time}</p>
        <p className="text-[10px] text-faint">{slot.end_time}</p>
      </div>
      <div className="h-10 w-px bg-gradient-to-b from-indigo-500/60 to-purple-500/20" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{slot.course_name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-faint">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {slot.room}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {slot.faculty}
          </span>
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
          slot.status === "completed"
            ? "bg-surface-2 text-muted"
            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        }`}
      >
        {slot.status}
      </span>
    </div>
  );
}

function EmptyList({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-border bg-surface p-5 text-sm text-muted">
      <span className="text-faint">{icon}</span> {text}
    </p>
  );
}

function MetricCard({
  icon,
  tint,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-accent/40">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium tracking-wide text-faint uppercase">{label}</p>
        <span className={`rounded-lg p-2 ${tint}`}>{icon}</span>
      </div>
      <p className="mt-3 truncate text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs text-faint">{sub}</p>
    </div>
  );
}

export function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(
    "en-US",
    opts ?? { month: "short", day: "numeric" },
  );
}

function SkeletonGrid() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-surface-2" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface-2 lg:col-span-3" />
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface-2 lg:col-span-2" />
      </div>
      <p className="flex items-center gap-2 text-xs text-faint">
        <RefreshCw className="h-3 w-3 animate-spin" /> Loading your dashboard…
      </p>
    </div>
  );
}
