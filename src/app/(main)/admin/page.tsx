import { PageHeader, Stamp } from "@/components/ui";
import { moderateAction, resetDemoAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { duration, money } from "@/lib/format";
import { platformAnalytics } from "@/lib/logic";
import Link from "next/link";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user || user.role !== "administrator") {
    return (
      <div>
        <PageHeader title="Admin" subtitle="Administrators only." />
        <Link className="btn" href="/login?next=/admin">
          Sign in as Riley
        </Link>
      </div>
    );
  }
  const section = typeof params.section === "string" ? params.section : "overview";
  const data = await read((db) => ({
    stats: platformAnalytics(db),
    streams: [...db.streams].sort((a, b) => b.started_at.localeCompare(a.started_at)),
    users: [...db.users].sort((a, b) => a.username.localeCompare(b.username)),
    reports: [...db.reports].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    gifts: [...db.giftTransactions].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    names: Object.fromEntries(db.users.map((person) => [person.id, person.display_name])),
    giftNames: Object.fromEntries(db.gifts.map((gift) => [gift.id, gift.name])),
    titles: Object.fromEntries(db.streams.map((stream) => [stream.id, stream.title])),
  }));
  const sections = ["overview", "streams", "users", "reports", "gifts"] as const;
  return (
    <div>
      <PageHeader title="Admin" subtitle="Streams, people, reports, gifts, and the platform ledger." />
      {params.error ? <p className="mb-3 text-sm text-rose-200">{params.error}</p> : null}
      {params.reset ? <p className="mb-3 text-sm text-emerald-200">Demo data restored.</p> : null}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {sections.map((item) => (
          <Link key={item} href={`/admin?section=${item}`} className={`chip ${section === item ? "active" : ""}`}>
            {item}
          </Link>
        ))}
      </div>
      {section === "overview" ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="card stat"><b>{data.stats.live_streams}</b><span className="text-sm text-white/50">Live</span></div>
          <div className="card stat"><b>{data.stats.users}</b><span className="text-sm text-white/50">Users</span></div>
          <div className="card stat"><b>{data.stats.open_reports}</b><span className="text-sm text-white/50">Open reports</span></div>
          <div className="card stat"><b>{data.stats.gifts}</b><span className="text-sm text-white/50">Gifts</span></div>
          <div className="card stat"><b>{data.stats.coins_spent}</b><span className="text-sm text-white/50">Coins spent</span></div>
          <div className="card stat"><b>{money(data.stats.revenue)}</b><span className="text-sm text-white/50">Revenue</span></div>
          <div className="card stat"><b>{duration(data.stats.watch_time)}</b><span className="text-sm text-white/50">Watch time</span></div>
          <div className="card stat"><b>{data.stats.peak_viewers}</b><span className="text-sm text-white/50">Peak viewers</span></div>
          <form action={resetDemoAction} className="card p-4">
            <button className="btn" type="submit">
              Reset demo data
            </button>
          </form>
        </div>
      ) : null}
      {section === "streams"
        ? data.streams.map((stream) => (
            <article key={stream.id} className="card mb-2 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <Link href={`/stream/${stream.id}`} className="font-semibold">
                  {stream.title}
                </Link>
                <p className="text-white/50">
                  {stream.status} · {stream.moderation_status} · {stream.content_rating} · {data.names[stream.creator]}
                </p>
              </div>
              {stream.moderation_status === "active" ? (
                <form action={moderateAction}>
                  <input type="hidden" name="type" value="suspend_stream" />
                  <input type="hidden" name="stream" value={stream.id} />
                  <input type="hidden" name="next" value="/admin?section=streams" />
                  <button className="btn btn-danger" type="submit">
                    Suspend
                  </button>
                </form>
              ) : null}
            </article>
          ))
        : null}
      {section === "users"
        ? data.users.map((person) => (
            <article key={person.id} className="card mb-2 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">
                  {person.display_name} · @{person.username}
                </p>
                <p className="text-white/50">
                  {person.email} · {person.role} · {person.coin_balance} coins · warnings {person.warning_count}
                  {person.banned ? " · banned" : ""}
                </p>
              </div>
              {person.role !== "administrator" ? (
                <form action={moderateAction}>
                  <input type="hidden" name="type" value={person.banned ? "unban" : "ban"} />
                  <input type="hidden" name="user" value={person.id} />
                  <input type="hidden" name="next" value="/admin?section=users" />
                  <button className="btn" type="submit">
                    {person.banned ? "Unban" : "Ban"}
                  </button>
                </form>
              ) : null}
            </article>
          ))
        : null}
      {section === "reports"
        ? data.reports.map((report) => (
            <article key={report.id} className="card mb-2 px-4 py-3 text-sm">
              <p className="font-semibold">
                {report.reason} · {report.status}
              </p>
              <p className="text-white/50">
                {data.names[report.reporter]} · <Stamp iso={report.created_at} />
              </p>
            </article>
          ))
        : null}
      {section === "gifts"
        ? data.gifts.map((gift) => (
            <article key={gift.id} className="card mb-2 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">
                  {data.giftNames[gift.gift]} · {gift.coins_spent} coins
                </p>
                <p className="text-white/50">
                  {data.names[gift.sender]} → {data.names[gift.receiver]} · {data.titles[gift.stream]}
                </p>
              </div>
              <form action={moderateAction}>
                <input type="hidden" name="type" value="refund" />
                <input type="hidden" name="gift" value={gift.id} />
                <input type="hidden" name="next" value="/admin?section=gifts" />
                <button className="btn" type="submit">
                  Refund
                </button>
              </form>
            </article>
          ))
        : null}
    </div>
  );
}
