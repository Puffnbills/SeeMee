import { GoLiveForm } from "@/components/go-live-form";
import { PageHeader } from "@/components/ui";
import { CATEGORY_CATALOG, LANGUAGES, PLACES, RATING_CATALOG } from "@/lib/constants";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { canGoLive } from "@/lib/logic";
import Link from "next/link";

export default async function GoLivePage() {
  const user = await getCurrentUser();
  const existing = user
    ? await read(
        (db) =>
          db.streams.find(
            (stream) => stream.creator === user.id && stream.status === "Live" && stream.moderation_status === "active",
          ) ?? null,
      )
    : null;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        kicker="Broadcast"
        title="Go live"
        subtitle="Pick a title, category, language, and rating. Sexual content and nudity require an 18+ rating."
      />
      {!user ? (
        <Link className="btn btn-primary" href="/login?next=/go-live">
          Sign in to go live
        </Link>
      ) : !canGoLive(user.role) ? (
        <div className="card p-4 text-sm text-white/70">
          Viewers can watch, chat, follow, buy coins, send gifts, and report. Go live is for creators and administrators. Sign in as Alex or Riley to open a room.
        </div>
      ) : existing ? (
        <div className="card grid gap-3 p-4">
          <p>You already have a live room: {existing.title}.</p>
          <Link className="btn btn-primary" href={`/studio/${existing.id}`}>
            Open studio
          </Link>
        </div>
      ) : (
        <GoLiveForm
          categories={CATEGORY_CATALOG.map((item) => ({ name: item.name, icon: item.icon }))}
          ratings={RATING_CATALOG.map((item) => ({ name: item.name, description: item.description }))}
          languages={LANGUAGES.map((item) => ({ code: item.code, label: item.label }))}
          places={PLACES.map((place) => place.name)}
        />
      )}
    </div>
  );
}
