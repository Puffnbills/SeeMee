import { Empty, PageHeader, Stamp } from "@/components/ui";
import { markNotificationsAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import Link from "next/link";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div>
        <PageHeader title="Notifications" />
        <Link className="btn btn-primary" href="/login?next=/notifications">
          Sign in
        </Link>
      </div>
    );
  }
  const notes = await read((db) =>
    db.notifications
      .filter((note) => note.recipient === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <PageHeader title="Notifications" subtitle="Follows, live alerts, gifts, and moderator notes." />
        <form action={markNotificationsAction}>
          <button className="btn" type="submit">
            Mark all read
          </button>
        </form>
      </div>
      {notes.length === 0 ? <Empty title="All quiet" body="Alerts show up when someone follows you or goes live." /> : null}
      <div className="grid gap-2">
        {notes.map((note) => {
          const body = (
            <article className={`card px-4 py-3 ${note.read ? "opacity-60" : ""}`}>
              <p className="text-xs uppercase tracking-wider text-white/40">{note.type}</p>
              <h2 className="font-semibold">{note.title}</h2>
              <p className="text-sm text-white/70">{note.body}</p>
              <p className="text-xs text-white/40">
                <Stamp iso={note.created_at} />
              </p>
            </article>
          );
          return note.link ? (
            <Link key={note.id} href={note.link}>
              {body}
            </Link>
          ) : (
            <div key={note.id}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
