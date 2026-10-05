"use client";

import { useState } from "react";
import StudentDashboard from "@/components/StudentDashboard";
import FacultyDashboard from "@/components/FacultyDashboard";
import { getUser, type AuthUser } from "@/lib/auth";

export default function DashboardPage() {
  // Read once at first render (this tree is client-rendered under AppShell).
  const [user] = useState<AuthUser | null>(() => (typeof window === "undefined" ? null : getUser()));

  // Role-based rendering: no static/hardcoded profile — the component tree
  // switches on the role stored at login time.
  return user?.role === "faculty" ? <FacultyDashboard /> : <StudentDashboard />;
}
