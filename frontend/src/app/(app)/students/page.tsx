"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { fetchStudentsList, type StudentRow } from "@/lib/api";
import { getUser } from "@/lib/auth";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState(false);
  const role = getUser()?.role;

  useEffect(() => {
    fetchStudentsList()
      .then(setStudents)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
          <Users className="h-7 w-7 text-indigo-400" /> Students
        </h1>
        <p className="mt-1 text-sm text-muted">All students enrolled across your courses.</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-300">
          Backend not reachable — start it on port 8000 and refresh.
        </div>
      )}

      {students && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs text-foreground/80">
              <tr>
                <th className="border-b-2 border-accent-blue px-5 py-3.5 text-left text-xs font-semibold text-foreground/80">Name</th>
                <th className="border-b-2 border-accent-red px-5 py-3.5 text-left text-xs font-semibold text-foreground/80">Enrollment No.</th>
                <th className="border-b-2 border-accent-red px-5 py-3.5 text-left text-xs font-semibold text-foreground/80">Major</th>
                <th className="border-b-2 border-accent-red px-5 py-3.5 text-left text-xs font-semibold text-foreground/80">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {students.map((s) => (
                <tr key={s.id} className="transition hover:bg-surface-2/60">
                  <td className="px-5 py-3.5 font-medium text-foreground">{s.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-300">
                      {s.enrollment_no}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-faint">{s.major}</td>
                  <td className="px-5 py-3.5 text-faint">{s.email}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-faint">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {role === "faculty" && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-faint">
          <UserPlus className="h-3.5 w-3.5" /> Use “Add New Student” on the dashboard to enroll someone new.
        </p>
      )}
    </div>
  );
}
