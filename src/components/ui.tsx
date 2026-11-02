import { formatDay, formatStamp } from "@/lib/format";
import type { PublicUser, Stream } from "@/lib/types";

const PALETTES: Record<string, [string, string]> = {
  rose: ["#ff4d6d", "#7c5cff"],
  iris: ["#7c5cff", "#3d8bfd"],
  gold: ["#f0c27a", "#ff7a59"],
  sea: ["#2ec4b6", "#3d8bfd"],
  lime: ["#8bd17c", "#2ec4b6"],
  ember: ["#ff7a3c", "#ff4d6d"],
  sky: ["#8ecae6", "#7c5cff"],
  wine: ["#8d3a5b", "#ff4d6d"],
};

const GRADS: Record<string, string> = {
  "grad:violet": "linear-gradient(160deg, #241432 0%, #ff4d6d 130%)",
  "grad:iris": "linear-gradient(160deg, #141432 0%, #7c5cff 120%)",
  "grad:rose": "linear-gradient(160deg, #2a1020 0%, #ff7a59 120%)",
  "grad:gold": "linear-gradient(160deg, #2a2112 0%, #f0c27a 120%)",
  "grad:lime": "linear-gradient(160deg, #102418 0%, #8bd17c 120%)",
  "grad:sea": "linear-gradient(160deg, #0e2428 0%, #2ec4b6 120%)",
  "grad:ember": "linear-gradient(160deg, #2a140c 0%, #ff7a3c 120%)",
  "grad:sky": "linear-gradient(160deg, #101828 0%, #8ecae6 120%)",
  "grad:wine": "linear-gradient(160deg, #1a0c14 0%, #c43b66 90%, #f0c27a 140%)",
};

export function Avatar({
  user,
  size = 40,
}: {
  user: { avatar: string; display_name: string };
  size?: number;
}) {
  const palette = PALETTES[user.avatar] ?? PALETTES.rose;
  const style = user.avatar.startsWith("http")
    ? undefined
    : { background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})` };
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, ...style }}>
      {user.avatar.startsWith("http") ? (
        // Remote avatars are provider profile photos. They stay sharp.
        <img src={user.avatar} alt="" />
      ) : (
        user.display_name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export function Thumbnail({ token, title }: { token: string; title: string }) {
  if (token.startsWith("http")) {
    return <img className="thumb-media" src={token} alt="" />;
  }
  return (
    <div className="thumb-media" style={{ background: GRADS[token] ?? GRADS["grad:violet"] }}>
      <span className="thumb-letter">{title.slice(0, 1)}</span>
    </div>
  );
}

export function ratingBadge(stream: Pick<Stream, "content_rating" | "includes_nudity" | "sexual_content">) {
  if (stream.content_rating.startsWith("Restricted")) return { label: "Restricted · 18+", tone: "adult" };
  if (stream.content_rating.startsWith("Mature") || stream.sexual_content) {
    return { label: stream.includes_nudity ? "18+ Sexual · Nudity" : "18+ Sexual", tone: "adult" };
  }
  if (stream.includes_nudity) return { label: "Nudity · 18+", tone: "adult" };
  if (stream.content_rating.startsWith("Teen")) return { label: "Teen", tone: "teen" };
  return null;
}

export function Verified() {
  return (
    <span title="Verified" aria-label="Verified" className="text-sky-300">
      ✓
    </span>
  );
}

export function PageHeader({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <header className="mb-5">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1 className="display text-3xl font-semibold md:text-4xl">{title}</h1>
      {subtitle ? <p className="mt-1 max-w-2xl text-sm text-white/60">{subtitle}</p> : null}
    </header>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6">
      <h2 className="display text-xl">{title}</h2>
      <p className="mt-1 text-sm text-white/60">{body}</p>
    </div>
  );
}

export function Stamp({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatStamp(iso)}</time>;
}

export function Day({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatDay(iso)}</time>;
}

export function personLabel(user: Pick<PublicUser, "display_name" | "verified">) {
  return (
    <span className="inline-flex items-center gap-1">
      {user.display_name}
      {user.verified ? <Verified /> : null}
    </span>
  );
}
