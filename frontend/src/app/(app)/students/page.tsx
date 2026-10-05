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
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <Users className="h-7 w-7 text-indigo-400" /> Students
        </h1>
        <p className="mt-1 text-sm text-slate-400">All students enrolled across your courses.</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-300">
          Backend not reachable — start it on port 8000 and refresh.
        </div>
      )}

      {students && (
        <div className="overflow-hidden rounded-2xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3.5 font-medium">Name</th>
                <th className="px-5 py-3.5 font-medium">Enrollment No.</th>
                <th className="px-5 py-3.5 font-medium">Major</th>
                <th className="px-5 py-3.5 font-medium">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-900/40">
              {students.map((s) => (
                <tr key={s.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5 font-medium text-white">{s.name}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-300">
                      {s.enrollment_no}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{s.major}</td>
                  <td className="px-5 py-3.5 text-slate-500">{s.email}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {role === "faculty" && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
          <UserPlus className="h-3.5 w-3.5" /> Use “Add New Student” on the dashboard to enroll someone new.
        </p>
      )}
    </div>
  );
}
