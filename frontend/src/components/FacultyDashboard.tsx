"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Layers,
  PenLine,
  Plus,
  RefreshCw,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  addStudent,
  createAssessment,
  fetchFacultyCourses,
  fetchFacultyOverview,
  fetchStudentsList,
  markAttendance,
  type CourseOption,
  type FacultyOverviewData,
  type StudentRow,
} from "@/lib/api";

type ModalKind = "student" | "attendance" | "assessment" | null;

export default function FacultyDashboard() {
  const [data, setData] = useState<FacultyOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);

  // `loading` starts true; setState only fires from async callbacks.
  const load = useCallback(() => {
    fetchFacultyOverview()
      .then(setData)
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  function refresh() {
    setLoading(true);
    setOffline(false);
    load();
  }

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

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome, {data.faculty.name}</h1>
          <p className="mt-1 text-sm text-slate-400">{data.faculty.department} Department</p>
        </div>
        <button
          onClick={refresh}
          title="Refresh"
          className="rounded-lg border border-white/10 bg-slate-900/60 p-2.5 text-slate-400 transition hover:text-indigo-300"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-6">
        {/* Totals */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<Layers className="h-5 w-5" />} tint="from-indigo-500/20 to-indigo-500/5 text-indigo-400" label="My Courses" value={data.totals.courses} />
          <StatCard icon={<Users className="h-5 w-5" />} tint="from-emerald-500/20 to-emerald-500/5 text-emerald-400" label="Total Students" value={data.totals.students} />
          <StatCard icon={<ClipboardList className="h-5 w-5" />} tint="from-amber-500/20 to-amber-500/5 text-amber-400" label="Assignments" value={data.totals.assignments} />
          <StatCard icon={<PenLine className="h-5 w-5" />} tint="from-purple-500/20 to-purple-500/5 text-purple-400" label="Tests" value={data.totals.tests} />
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ActionCard
            icon={<UserPlus className="h-5 w-5" />}
            title="Add New Student"
            desc="Create a student account instantly."
            onClick={() => setModal("student")}
          />
          <ActionCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Mark Attendance"
            desc="Record daily attendance per course."
            onClick={() => setModal("attendance")}
          />
          <ActionCard
            icon={<Plus className="h-5 w-5" />}
            title="Create Assignment / Test"
            desc="Publish coursework or schedule a test."
            onClick={() => setModal("assessment")}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Course stats table */}
          <section className="lg:col-span-3">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <GraduationCap className="h-4 w-4 text-indigo-400" /> My Courses
            </h2>
            <div className="overflow-hidden rounded-2xl border border-white/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Course</th>
                    <th className="px-5 py-3.5 font-medium">Students</th>
                    <th className="px-5 py-3.5 font-medium">Avg. Attendance</th>
                    <th className="px-5 py-3.5 font-medium">Work</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-900/40">
                  {data.courses.map((c) => (
                    <tr key={c.course_id} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">{c.course_code}</p>
                        <p className="text-xs text-slate-500">{c.course_name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{c.students}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                c.avg_attendance >= 75
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                  : "bg-gradient-to-r from-red-500 to-orange-400"
                              }`}
                              style={{ width: `${c.avg_attendance}%` }}
                            />
                          </div>
                          <span className={c.avg_attendance >= 75 ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-red-400"}>
                            {c.avg_attendance}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {c.assignments} asgmt · {c.tests} tests
                      </td>
                    </tr>
                  ))}
                  {data.courses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-slate-500">
                        No courses assigned to you yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right rail: upcoming + recent attendance */}
          <section className="space-y-6 lg:col-span-2">
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <CalendarClock className="h-4 w-4 text-amber-400" /> Upcoming Deadlines
              </h2>
              <div className="space-y-2.5">
                {data.upcoming.map((u, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{u.title}</p>
                      <p className="text-[11px] capitalize text-slate-500">{u.kind} · {u.course_code}</p>
                    </div>
                    <span className="ml-3 shrink-0 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                      {fmtDate(u.date)}
                    </span>
                  </div>
                ))}
                {data.upcoming.length === 0 && (
                  <p className="rounded-xl border border-white/5 bg-slate-900/50 p-4 text-sm text-slate-500">
                    Nothing scheduled ahead.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <BookOpenCheck className="h-4 w-4 text-emerald-400" /> Recent Attendance
              </h2>
              <div className="space-y-2.5">
                {data.recent_attendance.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{r.student_name}</p>
                      <p className="text-[11px] text-slate-500">{r.course_code} · {fmtDate(r.date)}</p>
                    </div>
                    {r.status === "present" ? (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Present
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                        <XCircle className="h-3.5 w-3.5" /> Absent
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {modal === "student" && (
        <AddStudentModal
          onClose={() => setModal(null)}
          onDone={(msg) => {
            setModal(null);
            refresh();
            alert(msg);
          }}
        />
      )}
      {modal === "attendance" && (
        <MarkAttendanceModal
          onClose={() => setModal(null)}
          onDone={(msg) => {
            setModal(null);
            refresh();
            alert(msg);
          }}
        />
      )}
      {modal === "assessment" && (
        <CreateAssessmentModal
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- modals
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

function AddStudentModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [major, setMajor] = useState("B.Tech Computer Science");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await addStudent({ name, email, enrollment_no: enrollmentNo, major });
      onDone(`Student "${created.name}" added — they can now log in with ${created.email} / password123.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Add New Student" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" className={inputCls} />
        </Field>
        <Field label="Email">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@atool.edu" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Enrollment no.">
            <input required minLength={3} value={enrollmentNo} onChange={(e) => setEnrollmentNo(e.target.value)} placeholder="ENR2026-0101" className={inputCls} />
          </Field>
          <Field label="Major">
            <input value={major} onChange={(e) => setMajor(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <p className="rounded-lg border border-white/5 bg-slate-800/50 px-3 py-2 text-[11px] text-slate-500">
          The student&apos;s initial password is <span className="font-semibold text-slate-300">password123</span> — ask them to change it later.
        </p>
        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        <SubmitButton busy={busy} label="Create student" />
      </form>
    </ModalShell>
  );
}

function MarkAttendanceModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"present" | "absent">("present");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchStudentsList(), fetchFacultyCourses()])
      .then(([s, c]) => {
        setStudents(s);
        setCourses(c);
        if (s[0]) setStudentId(String(s[0].id));
        if (c[0]) setCourseId(String(c[0].id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dropdowns."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await markAttendance({
        student_id: Number(studentId),
        course_id: Number(courseId),
        date,
        status,
      });
      onDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Mark Attendance" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Student">
          <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputCls}>
            <option value="" disabled>
              Select student…
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.enrollment_no})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Course">
          <select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
            <option value="" disabled>
              Select course…
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} — {c.course_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Status">
          {/* Present / Absent toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-800/70 p-1">
            {(["present", "absent"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium capitalize transition ${
                  status === s
                    ? s === "present"
                      ? "bg-emerald-600 text-white"
                      : "bg-red-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s === "present" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {s}
              </button>
            ))}
          </div>
        </Field>
        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        <SubmitButton busy={busy} label="Save attendance" />
      </form>
    </ModalShell>
  );
}

function CreateAssessmentModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [type, setType] = useState<"assignment" | "test">("assignment");
  const [title, setTitle] = useState("");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFacultyCourses()
      .then((c) => {
        setCourses(c);
        if (c[0]) setCourseId(String(c[0].id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load courses."));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await createAssessment({
        type,
        title,
        course_id: Number(courseId),
        due_date: dueDate,
        description,
        total_marks: Number(totalMarks) || 100,
      });
      onDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Create Assignment / Test" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Type">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-800/70 p-1">
            {(["assignment", "test"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-md py-2 text-sm font-medium capitalize transition ${
                  type === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Title">
          <input required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "test" ? "Midterm 2" : "Problem set 4"} className={inputCls} />
        </Field>
        <Field label="Course">
          <select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls}>
            <option value="" disabled>
              Select course…
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} — {c.course_name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={type === "test" ? "Test date" : "Due date"}>
            <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>
          {type === "test" && (
            <Field label="Total marks">
              <input required type="number" min={1} max={1000} value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} className={inputCls} />
            </Field>
          )}
        </div>
        {type === "assignment" && (
          <Field label="Description (optional)">
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should students submit?" className={inputCls} />
          </Field>
        )}
        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        <SubmitButton busy={busy} label={type === "test" ? "Create test" : "Create assignment"} />
      </form>
    </ModalShell>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : label}
    </button>
  );
}

// ---------------------------------------------------------------- shared
export function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({
  icon,
  tint,
  label,
  value,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-5 transition hover:border-indigo-500/30">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
        <span className={`rounded-lg bg-gradient-to-br p-2 ${tint}`}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900/50 p-5 text-left transition hover:border-indigo-500/40 hover:bg-slate-900/80"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/15 text-indigo-300 transition group-hover:scale-105">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{desc}</span>
      </span>
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/5 bg-slate-900/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-slate-900/40 lg:col-span-3" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-slate-900/40 lg:col-span-2" />
      </div>
    </div>
  );
}
