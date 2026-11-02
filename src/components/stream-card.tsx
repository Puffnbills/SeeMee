import { Thumbnail, ratingBadge, Verified } from "@/components/ui";
import { compact } from "@/lib/format";
import type { PublicUser, Stream } from "@/lib/types";
import Link from "next/link";

export function StreamCard({ stream, creator }: { stream: Stream; creator?: PublicUser }) {
  const badge = ratingBadge(stream);
  return (
    <Link href={`/stream/${stream.id}`} className="card stream-card">
      <div className="relative">
        <Thumbnail token={stream.thumbnail} title={stream.title} />
        <div className="shade" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {stream.status === "Live" ? (
            <span className="badge">
              <i className="live-dot" /> Live
            </span>
          ) : (
            <span className="badge">{stream.status}</span>
          )}
          {badge ? <span className={`badge ${badge.tone}`}>{badge.label}</span> : null}
          {stream.sensitive_content_warning && !badge ? <span className="badge">Sensitive</span> : null}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xs text-white/80">
            {stream.category} · {stream.location}
          </p>
          <h2 className="display text-xl leading-tight">{stream.title}</h2>
        </div>
        {stream.status === "Live" ? (
          <span className="badge absolute right-3 top-3">{compact(stream.viewer_count)}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 px-3 py-3 text-sm">
        {creator ? (
          <>
            <span className="text-white/80">@{creator.username}</span>
            <span className="inline-flex items-center gap-1">
              {creator.display_name}
              {creator.verified ? <Verified /> : null}
            </span>
          </>
        ) : null}
      </div>
    </Link>
  );
}

export function StreamGrid({ streams, creators }: { streams: Stream[]; creators: Record<string, PublicUser> }) {
  if (streams.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} creator={creators[stream.creator]} />
      ))}
    </div>
  );
}
