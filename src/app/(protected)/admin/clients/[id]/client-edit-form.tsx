"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  slug: string;
  projects: { project: { id: number; name: string; color: string | null } }[];
}

interface Project {
  id: number;
  name: string;
  color: string | null;
}

const COLOR_MAP: Record<string, string> = {
  aqua: "#06b6d4", blue: "#3b82f6", indigo: "#6366f1", green: "#10b981",
  red: "#ef4444", orange: "#f97316", yellow: "#eab308", purple: "#a855f7",
  pink: "#ec4899", teal: "#14b8a6",
};
function colorHex(c: string | null) {
  if (!c) return "#6b7280";
  return COLOR_MAP[c.toLowerCase()] ?? "#6b7280";
}

export default function ClientEditForm({ id }: { id: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/tasks/projects").then((r) => r.json()),
    ]).then(([clientsData, projectsData]) => {
      const found: Client | undefined = (clientsData.clients ?? []).find(
        (c: Client) => c.id === id
      );
      if (found) {
        setClient(found);
        setName(found.name);
        setEmail(found.email ?? "");
        setSlug(found.slug);
        setSelectedProjectIds(
          new Set(found.projects.map((cp) => cp.project.id))
        );
      }
      setAllProjects(projectsData.projects ?? []);
      setLoading(false);
    });
  }, [id]);

  const toggleProject = (pid: number) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body: Record<string, unknown> = {
      name,
      email,
      slug,
      projectIds: Array.from(selectedProjectIds),
    };
    if (password) body.password = password;
    const r = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) {
      router.push("/admin/clients");
    } else {
      const d = await r.json();
      setError(d.error ?? "Failed to update client");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--ink-3)" }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p style={{ color: "#ef4444" }}>Client not found.</p>
        <Link href="/admin/clients" style={{ color: "var(--ink-3)" }}>← Back</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: "var(--ink-3)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Clients
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <Field label="Name *">
          <input
            required
            autoFocus
            className="input-style"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Email (optional)">
          <input
            type="email"
            className="input-style"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Slug *">
          <input
            required
            className="input-style font-mono"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </Field>

        <Field label="New Password" hint="Leave blank to keep current password">
          <input
            type="text"
            className="input-style"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
          />
        </Field>

        <Field label="Project Access" hint="Client only sees tasks from selected projects">
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--line)" }}
          >
            {allProjects.length === 0 ? (
              <p className="px-3 py-2 text-xs" style={{ color: "var(--ink-3)" }}>
                No projects found.
              </p>
            ) : (
              allProjects.map((project) => {
                const checked = selectedProjectIds.has(project.id);
                return (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                    style={{
                      background: checked ? "#10b98110" : "transparent",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProject(project.id)}
                      className="w-3.5 h-3.5 accent-green-500"
                    />
                    <span
                      className="w-2 h-2 rounded-full flex-none"
                      style={{ background: colorHex(project.color) }}
                    />
                    <span className="text-sm flex-1" style={{ color: "var(--ink)" }}>
                      {project.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </Field>

        {error && (
          <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Link
            href="/admin/clients"
            className="text-sm px-4 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg"
            style={{ background: "#10b981", color: "#000", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </form>

      <style>{`
        .input-style {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--line);
          background: var(--bg);
          color: var(--ink);
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
        }
        .input-style:focus { border-color: #3b82f6; }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>
        {label}
        {hint && <span className="ml-1 font-normal" style={{ color: "var(--ink-3)" }}>— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
