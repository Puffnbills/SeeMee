export function compact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function duration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

export function formatStamp(iso: string) {
  return (
    new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(iso)) + " UTC"
  );
}

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "live";
}

export function safeNext(value: FormDataEntryValue | string | null | undefined) {
  const v = String(value ?? "");
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || v.includes("://")) return "/home";
  return v;
}

export function project(lat: number, lng: number) {
  const x = 8 + ((lng + 180) / 360) * 84;
  const y = 12 + ((90 - lat) / 180) * 76;
  return { x, y };
}

export function parseTags(text: string) {
  const found = text.match(/#([a-z0-9_]{2,30})/gi) ?? [];
  return [...new Set(found.map((tag) => tag.slice(1).toLowerCase()))];
}

export function languageLabel(code: string) {
  const names: Record<string, string> = {
    en: "English",
    es: "Spanish",
    pt: "Portuguese",
    fr: "French",
    de: "German",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
  };
  return names[code] ?? code;
}
