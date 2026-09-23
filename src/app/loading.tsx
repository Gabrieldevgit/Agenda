export default function Loading() {
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", color: "var(--muted)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--line)", borderTopColor: "var(--accent)", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
        <div style={{ font: "600 13px var(--font-body)" }}>Loading Tempo…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
