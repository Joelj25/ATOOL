"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpenCheck } from "lucide-react";
import { fetchStudentDashboard, type CourseAttendance } from "@/lib/api";
import { getUser } from "@/lib/auth";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseAttendance[] | null>(null);
  const [error, setError] = useState(false);
  const role = getUser()?.role;

  useEffect(() => {
    if (role === "faculty") {
      // Faculty don't have courses here — bounce to their dashboard.
      router.replace("/dashboard");
      return;
    }
    fetchStudentDashboard()
      .then((d) => setCourses(d.courses))
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
          <BookOpenCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" /> My Courses
        </h1>
        <p className="mt-1 text-sm text-muted">Your enrolled courses and live attendance.</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-300">
          Backend not reachable — start it on port 8000 and refresh.
        </div>
      )}

      {courses && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <div key={c.course_id} className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold tracking-wide text-indigo-600 dark:text-indigo-400 uppercase">{c.course_code}</p>
              <p className="mt-1 truncate text-sm font-medium text-foreground">{c.course_name}</p>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {c.percentage}
                <span className="text-sm font-medium text-faint">%</span>
              </p>
              <p className="mt-0.5 text-xs text-faint">
                {c.present} of {c.total} classes
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
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
          {courses.length === 0 && (
            <p className="text-sm text-faint">No attendance recorded yet.</p>
          )}
        </section>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-xs text-faint">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        75% attendance is required to be eligible for end-term examinations.
      </p>
    </div>
  );
}
