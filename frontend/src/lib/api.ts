/** Typed API client for the ATOOL FastAPI backend. */

import { getToken, type AuthUser } from "./auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------- shared
export interface CourseAttendance {
  course_id: number;
  course_code: string;
  course_name: string;
  present: number;
  total: number;
  percentage: number;
}

export interface CourseOption {
  id: number;
  course_code: string;
  course_name: string;
}

export interface StudentRow {
  id: number;
  user_id: number;
  name: string;
  email: string;
  enrollment_no: string;
  major: string;
}

// ----------------------------------------------------------- auth
export function login(
  email: string,
  password: string,
): Promise<{ access_token: string; user: AuthUser }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ------------------------------------------------------ student
export interface TimetableSlot {
  date: string;
  start_time: string;
  end_time: string;
  course_code: string;
  course_name: string;
  room: string;
  faculty: string;
  status: "completed" | "upcoming";
}

export interface UpcomingAssignment {
  id: number;
  title: string;
  course_code: string;
  course_name: string;
  due_date: string;
  description: string;
}

export interface UpcomingTest {
  id: number;
  title: string;
  course_code: string;
  course_name: string;
  test_date: string;
  total_marks: number;
}

export interface StudentDashboardData {
  student: {
    user_id: number;
    student_id: number;
    name: string;
    email: string;
    role: string;
    enrollment_no: string;
    major: string;
  };
  overall_attendance: {
    percentage: number;
    present: number;
    total: number;
    trend: string;
  };
  courses: CourseAttendance[];
  upcoming_assignments: UpcomingAssignment[];
  upcoming_tests: UpcomingTest[];
  timetable: TimetableSlot[];
}

export function fetchStudentDashboard(): Promise<StudentDashboardData> {
  return request("/api/student/dashboard");
}

// ------------------------------------------------------ faculty
export interface FacultyOverviewData {
  faculty: { name: string; department: string; email: string };
  totals: { courses: number; students: number; assignments: number; tests: number };
  courses: {
    course_id: number;
    course_code: string;
    course_name: string;
    students: number;
    assignments: number;
    tests: number;
    avg_attendance: number;
  }[];
  upcoming: { kind: "assignment" | "test"; title: string; course_code: string; date: string }[];
  recent_attendance: {
    student_name: string;
    course_code: string;
    date: string;
    status: "present" | "absent";
  }[];
}

export function fetchFacultyOverview(): Promise<FacultyOverviewData> {
  return request("/api/faculty/overview");
}

export function fetchFacultyCourses(): Promise<CourseOption[]> {
  return request("/api/faculty/courses");
}

export function fetchStudentsList(): Promise<StudentRow[]> {
  return request("/api/faculty/students-list");
}

export function addStudent(payload: {
  name: string;
  email: string;
  enrollment_no: string;
  major?: string;
}): Promise<StudentRow> {
  return request("/api/faculty/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function markAttendance(payload: {
  student_id: number;
  course_id: number;
  date: string;
  status: "present" | "absent";
}): Promise<{ ok: boolean; message: string }> {
  return request("/api/faculty/attendance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createAssessment(payload: {
  type: "assignment" | "test";
  title: string;
  course_id: number;
  due_date: string;
  description?: string;
  total_marks?: number;
}): Promise<{ ok: boolean; message: string; id: number }> {
  return request("/api/faculty/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------- chat
export interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

/** Conversation context sent to the backend (OpenAI-compatible roles). */
export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export function sendChat(
  message: string,
  history: ChatHistoryItem[] = [],
): Promise<{ reply: string }> {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

// ---------------------------------------------------------------- core
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Token expired/invalid — let the (app) layout bounce to /login.
    const error = new Error("unauthorized");
    error.name = "UnauthorizedError";
    throw error;
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
