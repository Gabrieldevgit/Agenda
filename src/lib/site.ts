export const siteConfig = {
  name: "Tempo",
  title: "Tempo — Agenda for people who keep it",
  description: "Calendar for people who actually keep it up to date. Day, Week, Month, Agenda — fast creation, drag & drop, timezone-aware.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://agenda.example.com").replace(/\/$/, ""),
  locale: "en_US",
  keywords: ["calendar", "agenda", "schedule", "productivity", "tempo"],
  author: "Tempo",
};

export function absoluteUrl(path: string) {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
