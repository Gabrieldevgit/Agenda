import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ font: "700 48px var(--font-display)", color: "var(--ink)" }}>404</div>
        <h1 style={{ margin: "8px 0", font: "700 20px var(--font-display)", color: "var(--ink)" }}>Page not found</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>The page you’re looking for doesn’t exist or was moved. Check the URL or go back to your calendar.</p>
        <Link href="/" className="btn primary" style={{ marginTop: 16, display: "inline-flex" }}>
          Go to calendar
        </Link>
      </div>
    </div>
  );
}
