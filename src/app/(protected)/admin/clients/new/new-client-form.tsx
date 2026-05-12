"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

export default function NewClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tasks/projects")
      .then((r) => r.json())
      .then((d) => setAllProjects(d.projects ?? []));
  }, []);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(toSlug(v));
  };

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
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        slug,
        password,
        projectIds: Array.from(selectedProjectIds),
      }),
    });
    setSaving(false);
    if (r.ok) {
      router.push("/admin/clients");
    } else {
      const d = await r.json();
      setError(d.error ?? "Failed to create client");
    }
  };

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
        <h1 className="text-2xl font-bold tracking-tight">New Client</h1>
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
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Corp"
          />
        </Field>

        <Field label="Email (optional)">
          <input
            type="email"
            className="input-style"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@acme.com"
          />
        </Field>

        <Field label="Slug *" hint="Used in the client portal URL">
          <input
            required
            className="input-style font-mono"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
            placeholder="acme-corp"
          />
        </Field>

        <Field label="Password *" hint="Client will use this to log in">
          <input
            required
            type="text"
            className="input-style"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a password"
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
            Create Client
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
