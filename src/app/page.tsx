import { StreamCard } from "@/components/stream-card";
import { read } from "@/lib/db";
import { feedFor, toPublicUser } from "@/lib/logic";
import Link from "next/link";

export default async function LandingPage() {
  const streams = await read((db) => {
    const live = feedFor(db, null, "live").slice(0, 4);
    const creators = Object.fromEntries(db.users.map((user) => [user.id, toPublicUser(user)]));
    return live.map((stream) => ({ stream, creator: creators[stream.creator] }));
  });
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="display text-2xl font-semibold">
          SeeMee
        </Link>
        <div className="flex gap-2">
          <Link className="btn" href="/home">
            Watch
          </Link>
          <Link className="btn btn-primary" href="/login">
            Sign in
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div>
          <p className="kicker">Public livestreams</p>
          <h1 className="display text-5xl font-semibold leading-none md:text-7xl">The room is already live.</h1>
          <p className="mt-4 max-w-xl text-lg text-white/70">
            SeeMee is a dark, vertical discovery feed for public streams. Follow creators, send gifts, and go live from your phone.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/home">
              Enter the feed
            </Link>
            <Link className="btn" href="/login?next=/go-live">
              Go live
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {streams.map(({ stream, creator }) => (
            <StreamCard key={stream.id} stream={stream} creator={creator} />
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-3 px-5 pb-16 md:grid-cols-4">
        {[
          ["Watch", "Live Now, map, trending, newest, following, and categories."],
          ["Gift", "Like, Fire, Star, Rocket, and Crown move coins in the open."],
          ["Go live", "Title, language, rating, sexual content, and nudity are set before the room opens."],
          ["Moderate", "Reports, warnings, suspensions, and bans have their own desks."],
        ].map(([title, body]) => (
          <article key={title} className="card p-4">
            <h2 className="display text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-white/60">{body}</p>
          </article>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="card p-5">
          <p className="kicker">Ratings</p>
          <h2 className="display text-3xl">Mature means 18+ sexual.</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/70">
            General and Teen streams play immediately. Sensitive streams stop on a warning. Sexual content and nudity use Mature or Restricted, then an 18+ confirmation. Thumbnails stay unblurred. A content filter hides Mature and Restricted streams entirely. The demo uses abstract art, not explicit imagery.
          </p>
        </div>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-wrap gap-3 px-5 pb-10 text-sm text-white/50">
        {[
          ["/home", "Home"],
          ["/home?tab=map", "World map"],
          ["/search", "Search"],
          ["/login", "Login"],
          ["/signup", "Signup"],
          ["/wallet", "Wallet"],
          ["/notifications", "Notifications"],
          ["/settings", "Settings"],
          ["/go-live", "Go live"],
          ["/moderation", "Moderation"],
          ["/admin", "Admin"],
        ].map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </footer>
    </main>
  );
}
