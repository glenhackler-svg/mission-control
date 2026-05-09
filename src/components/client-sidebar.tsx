"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ListTodo, Clock, LogOut } from "lucide-react";

const NAV = [
  { href: "/client/tasks", label: "Tasks", icon: ListTodo },
  { href: "/client/timer", label: "Time Summary", icon: Clock },
];

interface ClientSidebarProps {
  clientName: string;
}

export function ClientSidebar({ clientName }: ClientSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside
      className="border-r border-[var(--line)] flex flex-col gap-1 p-4 sticky top-0 h-screen"
      style={{ width: 220 }}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 mb-2 font-semibold text-[15px] tracking-[-0.01em]">
        <div
          className="w-6 h-6 rounded-md grid place-items-center"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          O
        </div>
        Mission Control
      </div>
      <div className="px-2 mb-4 text-[12px]" style={{ color: "var(--ink-3)" }}>
        👤 {clientName}
      </div>
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
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
      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] transition-colors text-[var(--ink-2)] hover:bg-[var(--panel)] hover:text-[var(--ink)] w-full"
      >
        <LogOut className="w-4 h-4 flex-none" />
        <span>Logout</span>
      </button>
    </aside>
  );
}
