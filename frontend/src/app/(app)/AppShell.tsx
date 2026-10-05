"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { clearAuth, getToken, getUser, type AuthUser } from "@/lib/auth";

/**
 * Client-only app shell. Rendered via next/dynamic with `ssr: false` from
 * (app)/layout.tsx, so localStorage can be read on the very first render
 * (no hydration mismatch, no setState-in-effect needed).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user] = useState<AuthUser | null>(() => (typeof window === "undefined" ? null : getUser()));

  useEffect(() => {
    if (!user || !getToken()) router.replace("/login");
  }, [user, router]);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070f]">
      <Sidebar
        user={user}
        pathname={pathname}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onLogout={handleLogout}
      />
      {/* Main workspace expands as the sidebar collapses (smooth transition). */}
      <main
        className={`min-h-screen p-8 transition-all duration-300 ease-in-out ${
          collapsed ? "ml-[4.5rem]" : "ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
