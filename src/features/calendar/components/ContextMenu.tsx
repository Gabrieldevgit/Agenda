"use client";
import { useEffect, useRef } from "react";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}
export interface MenuSection {
  items: MenuItem[];
}

export function ContextMenu({
  x,
  y,
  sections,
  onClose,
}: {
  x: number;
  y: number;
  sections: MenuSection[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onScroll() { onClose(); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  // Clamp to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, typeof window !== "undefined" ? window.innerWidth - 260 : x),
    top: Math.min(y, typeof window !== "undefined" ? window.innerHeight - 400 : y),
    zIndex: 70,
  };

  return (
    <div ref={ref} className="ctx" style={style} role="menu">
      {sections.map((sec, si) => (
        <div key={si} className="ctx-sec">
          {sec.items.map((it, idx) => (
            <button
              key={idx}
              role="menuitem"
              className={`ctx-item${it.danger ? " danger" : ""}`}
              disabled={it.disabled}
              onClick={() => { onClose(); it.action(); }}
            >
              {it.icon && <span className="ctx-icon">{it.icon}</span>}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
