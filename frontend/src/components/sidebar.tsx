"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import ThemeToggle from "@/components/theme-toggle";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** Role-based navigation — rendered dynamically from the logged-in user's role. */
export function navItemsForRole(role: AuthUser["role"]): NavItem[] {
  if (role === "faculty") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/students", label: "Students", icon: Users },
      { href: "/schedule", label: "Schedule", icon: CalendarDays },
    ];
  }
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "My Courses", icon: BookOpenCheck },
    { href: "/schedule", label: "Schedule", icon: CalendarDays },
  ];
}

export default function Sidebar({
  user,
  pathname,
  collapsed,
  onToggle,
  onLogout,
}: {
  user: AuthUser;
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}) {
  const initials = (user?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Fixed top bar — logo bottom-left, controls bottom-right, like a portal header */}
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-surface">
        <div className="flex h-16 items-end justify-between pb-2 pr-4 pl-6">
          <div className={`flex items-center gap-3 transition-all ${collapsed ? "w-[4.5rem]" : "w-56"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xl font-black tracking-tight text-foreground">ATOOL</p>
                <p className="text-[10px] font-medium tracking-widest text-muted uppercase">
                  AI Campus OS
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 text-xs font-bold text-indigo-600 ring-1 ring-indigo-400/30 dark:text-indigo-200">
              {initials}
            </span>
            <ThemeToggle />
            <button
              onClick={onLogout}
              title="Log out"
              className="rounded-lg p-2 text-muted transition hover:bg-foreground/5 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 top-16 z-40 flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out ${
          collapsed ? "w-[4.5rem]" : "w-64"
        }`}
      >
        {/* Collapse toggle pinned at the top, under the logo */}
        <div className={`flex pt-3 ${collapsed ? "justify-center" : "justify-start pl-3"}`}>
          <button
            onClick={onToggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-lg p-2 text-muted transition hover:bg-foreground/5 hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className={`mt-2 flex-1 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
          {navItemsForRole(user.role).map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-lg text-sm font-medium transition ${
                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-accent/10 text-accent ring-1 ring-inset ring-accent/25"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
