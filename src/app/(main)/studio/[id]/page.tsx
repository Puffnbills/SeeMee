import { GoLiveForm } from "@/components/go-live-form";
import { LiveStage } from "@/components/live-stage";
import { PageHeader } from "@/components/ui";
import { endStreamAction } from "@/lib/actions";
import { CATEGORY_CATALOG, LANGUAGES, PLACES, RATING_CATALOG } from "@/lib/constants";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { isAdmin } from "@/lib/logic";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/studio/${id}`);
  const stream = await read((db) => db.streams.find((item) => item.id === id) ?? null);
  if (!stream) notFound();
  if (stream.creator !== user.id && !isAdmin(user)) redirect(`/stream/${id}`);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="grid gap-3">
        <PageHeader kicker="Studio" title={stream.title} subtitle={`Room ${stream.stream_room_id}`} />
        <LiveStage room={stream.stream_room_id} publish title={stream.title} status={stream.status} />
        {stream.ingest_url ? (
          <p className="break-all text-xs text-white/50">Cloudflare ingest: {stream.ingest_url}</p>
        ) : (
          <p className="text-xs text-white/50">Cloudflare Stream is not configured, so there is no ingest URL.</p>
        )}
        <div className="flex gap-2">
          <Link className="btn" href={`/stream/${stream.id}`}>
            View as audience
          </Link>
          {stream.status === "Live" ? (
            <form action={endStreamAction}>
              <input type="hidden" name="stream" value={stream.id} />
              <button className="btn btn-danger" type="submit">
                End stream
              </button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Stream settings</h2>
        <GoLiveForm
          stream={stream}
          categories={CATEGORY_CATALOG.map((item) => ({ name: item.name, icon: item.icon }))}
          ratings={RATING_CATALOG.map((item) => ({ name: item.name, description: item.description }))}
          languages={LANGUAGES.map((item) => ({ code: item.code, label: item.label }))}
          places={PLACES.map((place) => place.name)}
        />
      </div>
    </div>
  );
}
