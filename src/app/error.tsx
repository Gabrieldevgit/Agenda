"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <h1 style={{ font: "700 22px var(--font-display)", color: "var(--ink)" }}>Something went wrong</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8, wordBreak: "break-word" }}>{error.message || "Unexpected error"}</p>
        <button onClick={() => reset()} className="btn primary" style={{ marginTop: 16 }}>
          Try again
        </button>
      </div>
    </div>
  );
}
