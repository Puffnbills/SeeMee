import { StreamGrid } from "@/components/stream-card";
import { Empty, PageHeader } from "@/components/ui";
import { WorldMap } from "@/components/world-map";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { feedFor, hiddenAdultCount, toPublicUser } from "@/lib/logic";
import Link from "next/link";

const TABS = [
  ["live", "Live Now"],
  ["location", "Location"],
  ["map", "World Map"],
  ["trending", "Trending"],
  ["newest", "Newest"],
  ["following", "Following"],
  ["category", "Category"],
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : "live";
  const category = typeof params.category === "string" ? params.category : "";
  const user = await getCurrentUser();
  const data = await read((db) => {
    const streams = feedFor(db, user, tab, category);
    const creators = Object.fromEntries(db.users.map((person) => [person.id, toPublicUser(person)]));
    return {
      streams,
      creators,
      categories: db.categories,
      hidden: hiddenAdultCount(db, user),
    };
  });
  const grouped = new Map<string, typeof data.streams>();
  for (const stream of data.streams) {
    const list = grouped.get(stream.location) ?? [];
    list.push(stream);
    grouped.set(stream.location, list);
  }
  return (
    <div>
      <PageHeader
        kicker={user ? `Hi ${user.display_name}` : "Discover"}
        title="Live rooms"
        subtitle="A vertical feed of public streams. Ratings travel with the card."
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([id, label]) => (
          <Link key={id} href={id === "live" ? "/home" : `/home?tab=${id}`} className={`chip ${tab === id ? "active" : ""}`}>
            {label}
          </Link>
        ))}
      </div>
      {data.hidden > 0 ? (
        <p className="mb-4 text-sm text-white/60">
          Content filter is on. {data.hidden} Mature or Restricted streams are hidden.{" "}
          <Link href="/settings">Change it in settings</Link>.
        </p>
      ) : null}
      {tab === "following" && !user ? (
        <Empty title="Sign in to see who you follow" body="Following is personal. Demo creator Alex already follows a few rooms." />
      ) : null}
      {tab === "category" && !category ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {data.categories.map((item) => (
            <Link key={item.id} href={`/home?tab=category&category=${encodeURIComponent(item.name)}`} className="card p-4">
              <span className="text-2xl">{item.icon}</span>
              <h2 className="mt-2 font-semibold">{item.name}</h2>
              <p className="text-sm text-white/50">{item.active_streams} live</p>
            </Link>
          ))}
        </div>
      ) : null}
      {tab === "map" ? <WorldMap streams={data.streams} creators={data.creators} /> : null}
      {tab === "location"
        ? [...grouped.entries()].map(([place, streams]) => (
            <section key={place} className="mb-6">
              <h2 className="mb-3 text-sm uppercase tracking-wider text-white/50">{place}</h2>
              <StreamGrid streams={streams} creators={data.creators} />
            </section>
          ))
        : null}
      {tab !== "map" && tab !== "location" && !(tab === "category" && !category) && !(tab === "following" && !user) ? (
        data.streams.length ? (
          <StreamGrid streams={data.streams} creators={data.creators} />
        ) : (
          <Empty title="Nothing in this lane" body="Try Live Now, or turn the content filter off to see 18+ rooms." />
        )
      ) : null}
    </div>
  );
}
