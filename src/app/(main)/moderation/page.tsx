import { PageHeader, Stamp } from "@/components/ui";
import { moderateAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { isStaff } from "@/lib/logic";
import Link from "next/link";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) {
    return (
      <div>
        <PageHeader title="Moderation" subtitle="Moderators and administrators review the queue." />
        <Link className="btn" href="/login?next=/moderation">
          Sign in as Morgan
        </Link>
      </div>
    );
  }
  const data = await read((db) => ({
    reports: db.reports
      .filter((report) => report.status === "Open" || report.status === "Under Review")
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    names: Object.fromEntries(db.users.map((person) => [person.id, person.display_name])),
    titles: Object.fromEntries(db.streams.map((stream) => [stream.id, stream.title])),
    messages: Object.fromEntries(db.messages.map((message) => [message.id, message.message])),
  }));
  return (
    <div>
      <PageHeader title="Moderation queue" subtitle="Remove a message, suspend a stream, warn the user, or close the report." />
      {typeof params.error === "string" ? <p className="mb-3 text-sm text-rose-200">{params.error}</p> : null}
      {data.reports.length === 0 ? <p className="text-sm text-white/60">The queue is clear.</p> : null}
      <div className="grid gap-3">
        {data.reports.map((report) => (
          <article key={report.id} className="card grid gap-3 p-4">
            <div>
              <p className="kicker">{report.status}</p>
              <h2 className="text-xl font-semibold">{report.reason}</h2>
              <p className="text-sm text-white/60">
                From {data.names[report.reporter]} · <Stamp iso={report.created_at} />
              </p>
              {report.reported_user ? <p className="text-sm">User: {data.names[report.reported_user]}</p> : null}
              {report.reported_stream ? (
                <p className="text-sm">
                  Stream: <Link href={`/stream/${report.reported_stream}`}>{data.titles[report.reported_stream]}</Link>
                </p>
              ) : null}
              {report.reported_message ? <p className="text-sm text-white/70">“{data.messages[report.reported_message]}”</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {report.reported_message ? (
                <ModButton type="remove_message" message={report.reported_message} report={report.id} label="Remove message" />
              ) : null}
              {report.reported_stream ? (
                <ModButton type="suspend_stream" stream={report.reported_stream} report={report.id} label="Suspend stream" />
              ) : null}
              {report.reported_user ? <ModButton type="warn" user={report.reported_user} report={report.id} label="Warn user" /> : null}
              <ModButton type="status" report={report.id} status="Resolved" label="Resolve" />
              <ModButton type="status" report={report.id} status="Rejected" label="Reject" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ModButton({
  type,
  label,
  report,
  message,
  stream,
  user,
  status,
}: {
  type: string;
  label: string;
  report?: string;
  message?: string;
  stream?: string;
  user?: string;
  status?: string;
}) {
  return (
    <form action={moderateAction}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value="/moderation" />
      {report ? <input type="hidden" name="report" value={report} /> : null}
      {message ? <input type="hidden" name="message" value={message} /> : null}
      {stream ? <input type="hidden" name="stream" value={stream} /> : null}
      {user ? <input type="hidden" name="user" value={user} /> : null}
      {status ? <input type="hidden" name="status" value={status} /> : null}
      <button className="btn" type="submit">
        {label}
      </button>
    </form>
  );
}
