"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { fetchFacultyOverview, fetchStudentDashboard, type TimetableSlot } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { fmtDate } from "@/components/StudentDashboard";
import { fmtDate as fmtDateFac } from "@/components/FacultyDashboard";

export default function SchedulePage() {
  const [slots, setSlots] = useState<TimetableSlot[] | null>(null);
  const [deadlines, setDeadlines] = useState<
    { kind: "assignment" | "test"; title: string; course_code: string; date: string }[]
  >([]);
  const [error, setError] = useState(false);
  const role = getUser()?.role;

  useEffect(() => {
    if (role === "faculty") {
      fetchFacultyOverview()
        .then((d) => setDeadlines(d.upcoming))
        .catch(() => setError(true));
    } else {
      fetchStudentDashboard()
        .then((d) => setSlots(d.timetable))
        .catch(() => setError(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
          <CalendarDays className="h-7 w-7 text-indigo-600 dark:text-indigo-400" /> Schedule
        </h1>
        <p className="mt-1 text-sm text-muted">
          {role === "faculty" ? "Upcoming deadlines across your courses." : "Your classes for the week ahead."}
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-300">
          Backend not reachable — start it on port 8000 and refresh.
        </div>
      )}

      {role === "faculty"
        ? deadlines.map((u, i) => (
            <div key={i} className="mb-2.5 flex max-w-3xl items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{u.title}</p>
                <p className="text-[11px] capitalize text-faint">{u.kind} · {u.course_code}</p>
              </div>
              <span className="rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                {fmtDateFac(u.date)}
              </span>
            </div>
          ))
        : slots?.map((s, i) => (
            <div key={i} className="mb-2.5 flex max-w-3xl items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{s.course_name}</p>
                <p className="text-[11px] text-faint">
                  {s.course_code} · {s.room} · {s.faculty}
                </p>
              </div>
              <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300">
                {fmtDate(s.date)} · {s.start_time}
              </span>
            </div>
          ))}
    </div>
  );
}
