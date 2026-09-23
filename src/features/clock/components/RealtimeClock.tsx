"use client";
import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";

export function RealtimeClock({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ font: "700 18px/1 var(--font-display)", letterSpacing: "-.02em", color: "var(--ink)" }}>--:--:--</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginTop: 2 }}>Loading…</div>
        </div>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--now)",
            boxShadow: "0 0 0 6px color-mix(in srgb, var(--now) 16%, transparent)",
            flex: "none",
          }}
          aria-hidden
        />
      </div>
    );
  }

  const time = formatInTimeZone(now, timeZone, "h:mm:ss a");
  const date = formatInTimeZone(now, timeZone, "EEEE, MMM d");
  const tzAbbr = formatInTimeZone(now, timeZone, "zzz");

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ font: "700 18px/1 var(--font-display)", letterSpacing: "-.02em", color: "var(--ink)" }}>{time}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginTop: 2 }}>
          {date} · {tzAbbr}
        </div>
      </div>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--now)",
          boxShadow: "0 0 0 6px color-mix(in srgb, var(--now) 16%, transparent)",
          flex: "none",
        }}
        aria-hidden
      />
    </div>
  );
}
