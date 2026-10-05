"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, GraduationCap, Lock, Mail, Loader2, Sparkles, Eye, EyeOff, UserRound } from "lucide-react";
import { login } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function doLogin(mail: string, pass: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await login(mail, pass);
      saveAuth(res.access_token, res.user);
      // Role-aware redirect: the app shell + dashboard render per role.
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof TypeError || (err instanceof Error && err.message === "Failed to fetch")
          ? "Could not reach the backend — is it running on port 8000?"
          : err instanceof Error
            ? err.message
            : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doLogin(email, password);
  }

  return (
    <main className="aurora flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
            <BrainCircuit className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ATOOL</h1>
          <p className="mt-1 text-sm text-slate-400">Your AI-powered campus operating system</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="mb-1 text-lg font-semibold text-white">Sign in</h2>
          <p className="mb-5 text-xs text-slate-500">Students and faculty use the same login — your dashboard adapts to your role.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@atool.edu"
                  className="w-full rounded-lg border border-white/10 bg-slate-800/70 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-slate-800/70 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <Sparkles className="h-4 w-4" /> Sign in to ATOOL
                </>
              )}
            </button>
          </form>

          {/* Quick login buttons */}
          <div className="mt-6 border-t border-white/5 pt-5">
            <p className="mb-3 text-center text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Demo accounts
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => doLogin("student@atool.edu", "password123")}
                className="flex items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20 disabled:opacity-60"
              >
                <GraduationCap className="h-4 w-4" /> Demo Student
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => doLogin("faculty@atool.edu", "password123")}
                className="flex items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2.5 text-sm font-medium text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-60"
              >
                <UserRound className="h-4 w-4" /> Demo Faculty
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-600">
              student@atool.edu · faculty@atool.edu — password: <span className="text-slate-400">password123</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
