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
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/5 bg-slate-950/90 backdrop-blur transition-all duration-300 ease-in-out ${
        collapsed ? "w-[4.5rem]" : "w-64"
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center py-5 ${collapsed ? "flex-col gap-3 px-2" : "gap-3 px-5"}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
          <BrainCircuit className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold tracking-tight text-white">ATOOL</p>
            <p className="text-[10px] uppercase tracking-widest text-indigo-400">AI Campus OS</p>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-200 ${
            collapsed ? "" : "ml-auto"
          }`}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
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
                  ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-white/5 p-3">
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-3"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-500/40 text-xs font-bold text-indigo-200 ring-1 ring-indigo-400/30">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs capitalize text-indigo-400/80">{user.role}</p>
              </div>
              <button
                onClick={onLogout}
                title="Log out"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={onLogout}
            title="Log out"
            className="mt-2 flex w-full justify-center rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
