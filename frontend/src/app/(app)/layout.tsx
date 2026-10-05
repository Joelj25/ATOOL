"use client";

import dynamic from "next/dynamic";

// ssr:false is required: the shell reads localStorage (JWT/user) at render time.
const AppShell = dynamic(() => import("./AppShell"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#05070f]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
    </div>
  ),
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
