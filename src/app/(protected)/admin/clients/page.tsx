"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  slug: string;
  createdAt: string;
  _count: { tasks: number };
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    const r = await fetch("/api/clients");
    const d = await r.json();
    setClients(d.clients ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"? Their tasks will be unassigned.`)) return;
    setDeleting(id);
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" /> Clients
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
            Manage client portal access
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg"
          style={{ background: "#3b82f6", color: "#fff" }}
        >
          <Plus className="w-4 h-4" /> Add Client
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-12" style={{ color: "var(--ink-3)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-4" style={{ color: "var(--ink-3)" }}>No clients yet.</p>
          <Link
            href="/admin/clients/new"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg"
            style={{ background: "#10b981", color: "#000" }}
          >
            <Plus className="w-4 h-4" /> Add First Client
          </Link>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                {["Name", "Email", "Slug", "Tasks", "Created", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${h === "Actions" ? "text-right" : "text-left"}`}
                    style={{ color: "var(--ink-3)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    background: i % 2 === 0 ? "var(--bg)" : "var(--panel)",
                    borderTop: i > 0 ? "1px solid var(--line)" : undefined,
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{c.name}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: "var(--ink-3)" }}>{c.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <code
                      className="text-[11px] px-2 py-0.5 rounded"
                      style={{ background: "var(--line)", color: "var(--ink-2)" }}
                    >
                      {c.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: "var(--ink-2)" }}>
                    {c._count.tasks}
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: "var(--ink-3)" }}>
                    {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg"
                        style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deleting === c.id}
                        className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg"
                        style={{ background: "#ef444422", border: "1px solid #ef4444", color: "#ef4444" }}
                      >
                        {deleting === c.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
