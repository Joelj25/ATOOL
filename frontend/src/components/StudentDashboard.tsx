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
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Backend not reachable
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Start it with <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">uvicorn main:app --port 8000</code>{" "}
          inside <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">backend/</code>, then refresh.
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
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome back, {student.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {student.enrollment_no} · {student.major}
        </p>
      </header>

      <div className="space-y-6">
        {/* Metric cards — computed from this student's DB rows */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            icon={<BookOpenCheck className="h-5 w-5" />}
            tint="from-emerald-500/20 to-emerald-500/5 text-emerald-400"
            label="My Attendance"
            value={`${att.percentage}%`}
            sub={`${att.present}/${att.total} classes · ${att.trend}`}
          />
          <MetricCard
            icon={<ClipboardList className="h-5 w-5" />}
            tint="from-amber-500/20 to-amber-500/5 text-amber-400"
            label="Upcoming Assignments"
            value={`${data.upcoming_assignments.length}`}
            sub={data.upcoming_assignments[0] ? `Next: ${data.upcoming_assignments[0].title}` : "Nothing due 🎉"}
          />
          <MetricCard
            icon={<PenLine className="h-5 w-5" />}
            tint="from-indigo-500/20 to-indigo-500/5 text-indigo-400"
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
              <div className="mb-3 flex gap-1 rounded-lg bg-slate-900/60 p-1 text-sm font-medium w-fit">
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
                      tab === key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
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
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <BookOpenCheck className="h-4 w-4 text-emerald-400" /> Attendance by Course
              </h2>
              <div className="space-y-3 rounded-xl border border-white/5 bg-slate-900/50 p-4">
                {data.courses.map((c) => (
                  <div key={c.course_id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">{c.course_code}</span>
                      <span className={c.percentage >= 75 ? "text-emerald-400" : "text-red-400"}>
                        {c.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
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
                  <p className="text-xs text-slate-500">No attendance recorded yet.</p>
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

function CoursesTable({ courses }: { courses: StudentDashboardData["courses"] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900/80 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-5 py-3.5 font-medium">Code</th>
            <th className="px-5 py-3.5 font-medium">Course</th>
            <th className="px-5 py-3.5 font-medium">Attendance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-slate-900/40">
          {courses.map((c) => (
            <tr key={c.course_id} className="transition hover:bg-white/[0.03]">
              <td className="px-5 py-3.5">
                <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-300">
                  {c.course_code}
                </span>
              </td>
              <td className="px-5 py-3.5 font-medium text-white">{c.course_name}</td>
              <td className="px-5 py-3.5">
                <span className={c.percentage >= 75 ? "font-semibold text-emerald-400" : "font-semibold text-red-400"}>
                  {c.percentage}%
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  ({c.present}/{c.total})
                </span>
              </td>
            </tr>
          ))}
          {courses.length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-6 text-center text-slate-500">
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
        <div key={a.id} className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{a.title}</p>
              <p className="text-[11px] text-slate-500">{a.course_code} · {a.course_name}</p>
              {a.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.description}</p>}
            </div>
            <span className="shrink-0 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
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
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{t.title}</p>
            <p className="text-[11px] text-slate-500">{t.course_code} · {t.course_name}</p>
          </div>
          <span className="ml-3 shrink-0 rounded-lg bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400">
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
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
        <CalendarClock className="h-4 w-4 text-indigo-400" /> Week Ahead
      </h2>
      <div className="space-y-2.5">
        {grouped.map(([day, daySlots]) => (
          <div key={day}>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
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
          <p className="rounded-xl border border-white/5 bg-slate-900/50 p-4 text-sm text-slate-500">
            No classes scheduled this week.
          </p>
        )}
      </div>
    </div>
  );
}

function SlotRow({ slot }: { slot: TimetableSlot }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-slate-900/50 p-3.5 transition hover:border-indigo-500/30">
      <div className="w-20 shrink-0 text-right">
        <p className="text-sm font-semibold text-white">{slot.start_time}</p>
        <p className="text-[10px] text-slate-500">{slot.end_time}</p>
      </div>
      <div className="h-10 w-px bg-gradient-to-b from-indigo-500/50 to-purple-500/20" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{slot.course_name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
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
          slot.status === "completed" ? "bg-slate-500/10 text-slate-400" : "bg-emerald-500/10 text-emerald-400"
        }`}
      >
        {slot.status}
      </span>
    </div>
  );
}

function EmptyList({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-900/50 p-5 text-sm text-slate-400">
      <span className="text-slate-500">{icon}</span> {text}
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
    <div className="group rounded-2xl border border-white/5 bg-slate-900/50 p-5 transition hover:border-indigo-500/30 hover:bg-slate-900/80">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
        <span className={`rounded-lg bg-gradient-to-br p-2 ${tint}`}>{icon}</span>
      </div>
      <p className="mt-3 truncate text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{sub}</p>
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
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/5 bg-slate-900/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-slate-900/40 lg:col-span-3" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-slate-900/40 lg:col-span-2" />
      </div>
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <RefreshCw className="h-3 w-3 animate-spin" /> Loading your dashboard…
      </p>
    </div>
  );
}
