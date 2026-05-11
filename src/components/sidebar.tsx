"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Bot, ListTodo, Lightbulb, Calendar, CheckSquare, Mail, Users, LogOut, Clock } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/crons", label: "Crons", icon: Clock },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/missions", label: "Missions", icon: ListTodo },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/mail", label: "Mail", icon: Mail },
  { href: "/admin/clients", label: "Clients", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <aside
      className="border-r border-[var(--line)] flex flex-col gap-1 p-4 sticky top-0 h-screen"
      style={{ width: 220 }}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 mb-6 font-semibold text-[15px] tracking-[-0.01em]">
        <div
          className="w-6 h-6 rounded-md grid place-items-center"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          O
        </div>
        Xenler Mission Control
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] transition-colors ${
                active
                  ? "bg-[var(--panel)] text-[var(--ink)]"
                  : "text-[var(--ink-2)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon className="w-4 h-4 flex-none" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] w-full text-[var(--ink-3)] hover:bg-[var(--panel)] hover:text-[var(--ink)] transition-colors"
        >
          <LogOut className="w-4 h-4 flex-none" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
