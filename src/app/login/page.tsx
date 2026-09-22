"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const supabase = createSupabaseBrowserClient();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Signing in…");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else { setMsg("Signed in — redirecting…"); window.location.href = "/"; }
  }
  async function signUp() {
    setMsg("Signing up…");
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? error.message : "Check your email for confirmation.");
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Tempo — Sign in</h1>
      <form onSubmit={signIn} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }} />
        <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }} />
        <button type="submit" style={{ padding: 10, background: "#3D3DE0", color: "#fff", borderRadius: 8, border: 0 }}>Sign in</button>
        <button type="button" onClick={signUp} style={{ padding: 10, background: "#fff", border: "1px solid #ddd", borderRadius: 8 }}>Sign up</button>
      </form>
      {msg && <p style={{ marginTop: 12, fontSize: 13, color: "#666" }}>{msg}</p>}
      <p style={{ marginTop: 16, fontSize: 12, color: "#888" }}>Demo mode: set <code>TEMPO_DEMO_MODE=true</code> to skip auth locally.</p>
    </div>
  );
}
