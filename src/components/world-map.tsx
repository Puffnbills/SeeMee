import { project, compact } from "@/lib/format";
import type { PublicUser, Stream } from "@/lib/types";
import Link from "next/link";

export function WorldMap({ streams, creators }: { streams: Stream[]; creators: Record<string, PublicUser> }) {
  const pins = streams.filter((stream) => stream.latitude != null && stream.longitude != null && stream.status === "Live");
  return (
    <div className="grid gap-4">
      <div className="map" role="img" aria-label="World map of live streams">
        {pins.map((stream) => {
          const point = project(stream.latitude as number, stream.longitude as number);
          return (
            <Link
              key={stream.id}
              href={`/stream/${stream.id}`}
              className="map-pin"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <i />
              <span className="badge mt-1 whitespace-nowrap">
                {stream.location} · {compact(stream.viewer_count)}
              </span>
            </Link>
          );
        })}
      </div>
      <ul className="grid gap-2">
        {pins.map((stream) => (
          <li key={stream.id}>
            <Link href={`/stream/${stream.id}`} className="card flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {stream.location} — {stream.title}
                <span className="muted"> · {creators[stream.creator]?.display_name}</span>
              </span>
              <span>{compact(stream.viewer_count)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
