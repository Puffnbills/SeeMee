import { StreamGrid } from "@/components/stream-card";
import { Avatar, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { searchAll, toPublicUser } from "@/lib/logic";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const user = await getCurrentUser();
  const data = await read((db) => {
    const result = searchAll(db, user, q);
    return {
      ...result,
      users: result.users.map(toPublicUser),
      creators: Object.fromEntries(db.users.map((person) => [person.id, toPublicUser(person)])),
    };
  });
  return (
    <div>
      <PageHeader title="Search" subtitle="Users, titles, hashtags, and categories." />
      <form action="/search" className="mb-5">
        <input className="field" name="q" defaultValue={q} placeholder="Try nova, #synth, or music" aria-label="Search" />
      </form>
      <section className="mb-6">
        <h2 className="mb-2 text-sm uppercase tracking-wider text-white/50">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {data.categories.map((category) => (
            <Link key={category.id} className="chip" href={`/home?tab=category&category=${encodeURIComponent(category.name)}`}>
              {category.icon} {category.name}
            </Link>
          ))}
        </div>
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-sm uppercase tracking-wider text-white/50">Hashtags</h2>
        <div className="flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <Link key={tag} className="chip" href={`/search?q=${encodeURIComponent("#" + tag)}`}>
              #{tag}
            </Link>
          ))}
        </div>
      </section>
      {q ? (
        <>
          <section className="mb-6">
            <h2 className="mb-2 text-sm uppercase tracking-wider text-white/50">People</h2>
            <div className="grid gap-2">
              {data.users.map((person) => (
                <Link key={person.id} href={`/u/${person.username}`} className="card flex items-center gap-3 px-4 py-3">
                  <Avatar user={person} />
                  <span>
                    <strong className="block">{person.display_name}</strong>
                    <span className="text-sm text-white/50">@{person.username}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-sm uppercase tracking-wider text-white/50">Streams</h2>
            <StreamGrid streams={data.streams} creators={data.creators} />
          </section>
        </>
      ) : null}
    </div>
  );
}
