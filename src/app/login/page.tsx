"use client";
import { Suspense, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const from = searchParams.get("from") || "/";
      window.location.href = from;
    } else {
      setError("Wrong password. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        required
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          borderRadius: "0.5rem",
          border: "1px solid var(--line, #333)",
          background: "var(--bg, #0a0a0a)",
          color: "var(--ink, #fff)",
          fontSize: 14,
          boxSizing: "border-box",
          marginBottom: "1rem",
          outline: "none",
        }}
      />
      {error && (
        <p style={{ color: "#f87171", fontSize: 13, marginBottom: "1rem", textAlign: "center" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          background: "var(--accent, #6ee7b7)",
          color: "#000",
          fontWeight: 600,
          fontSize: 14,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0a0a0a)",
      }}
    >
      <div
        style={{
          width: 360,
          padding: "2.5rem",
          borderRadius: "1rem",
          background: "var(--panel, #111)",
          border: "1px solid var(--line, #222)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink, #fff)", margin: 0 }}>
            Mission Control
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-2, #888)", marginTop: 4 }}>
            Xenler Consulting
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
