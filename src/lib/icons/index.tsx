/**
 * Tempo icon set — plain inline SVGs, no emoji, no icon font.
 * Every icon takes the same props so it drops into buttons/labels consistently
 * and inherits color via currentColor (works in light + dark tokens).
 */
import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps) {
  const { size = 20, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m15 18-6-6 6-6" /></svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const DayViewIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 10h8" /></svg>
);
export const WeekViewIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9.5 4v16M14.5 4v16" /></svg>
);
export const MonthViewIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" /></svg>
);
export const AgendaViewIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>
);
export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>
);
export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" /></svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m6 6 12 12M18 6 6 18" /></svg>
);
export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx={12} cy={12} r={3} /><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>
);
export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx={12} cy={12} r={4} /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
);
export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
);
export const CalendarMarkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const PrintIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9V3h12v6" />
    <rect x="4" y="9" width="16" height="8" rx="2" />
    <path d="M6 14h12v7H6z" />
    <path d="M8 13h.01" />
  </svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx={12} cy={12} r={9} /><path d="M12 7v5l3 2" /></svg>
);
export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 8a6 6 0 0 1 12 0c0 7-6 5-6 9H6s-6-2-6-9a6 6 0 0 1 12 0z" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
);
export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx={12} cy={7} r={4} /></svg>
);
export const LayoutIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx={2} /><path d="M3 9h18M9 21V9" /></svg>
);
export const GlobeIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx={12} cy={12} r={10} /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
);
export const LogOutIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const CalendarJumpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const BookIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5c2.5-1 5.5-1 8 0v14c-2.5-1-5.5-1-8 0V5Z" />
    <path d="M20 5c-2.5-1-5.5-1-8 0v14c2.5-1 5.5-1 8 0V5Z" />
  </svg>
);
export const NoteIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </svg>
);

/** Used as the browser-tab favicon (data: URI) instead of an emoji glyph. */
export const FAVICON_SVG_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='3.5' y='5' width='17' height='15' rx='4' fill='%233D3DE0'/%3E%3Cpath d='M3.5 9.5h17' stroke='white' stroke-width='1.5'/%3E%3Ccircle cx='16.7' cy='14.5' r='1.6' fill='white'/%3E%3C/svg%3E";
