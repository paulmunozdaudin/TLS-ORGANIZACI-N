const DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
});

const DATE_FORMATTER_FULL = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function combineDateAndTime(dateStr: string | null, timeStr: string | null): Date | null {
  if (!dateStr) return null;
  const date = parseDateOnly(dateStr);
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    date.setHours(h || 0, m || 0, 0, 0);
  }
  return date;
}

export function formatMeetingDate(dateStr: string | null, timeStr?: string | null): string {
  if (!dateStr) return "";
  const date = parseDateOnly(dateStr);
  const formatted = DATE_FORMATTER.format(date);
  return timeStr ? `${formatted}, ${timeStr}` : formatted;
}

export function formatMeetingDateFull(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = parseDateOnly(dateStr);
  const formatted = DATE_FORMATTER_FULL.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatRelativeTime(isoStr: string): string {
  const date = new Date(isoStr);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "ahora mismo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `hace ${diffHour} h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `hace ${diffDay} d`;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
