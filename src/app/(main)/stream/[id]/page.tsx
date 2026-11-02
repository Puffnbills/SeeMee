import { ContentGate } from "@/components/content-gate";
import { StreamRoom } from "@/components/stream-room";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { buildStreamState, gateKind, isStaff, passesContentFilter, toPublicUser } from "@/lib/logic";
import { hasAcknowledged } from "@/lib/session";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const title = await read((db) => db.streams.find((stream) => stream.id === id)?.title ?? "Stream");
  return { title };
}

export default async function StreamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const data = await read((db) => {
    const stream = db.streams.find((item) => item.id === id);
    if (!stream) return null;
    const creator = db.users.find((person) => person.id === stream.creator);
    if (!creator) return null;
    const state = buildStreamState(db, id, user);
    return {
      stream,
      creator: toPublicUser(creator),
      following: user ? db.follows.some((row) => row.follower === user.id && row.creator === creator.id) : false,
      gifts: db.gifts,
      state,
      filtered: !passesContentFilter(stream, user),
      staff: isStaff(user),
    };
  });
  if (!data) notFound();
  if (data.filtered) {
    return (
      <div className="card p-6">
        <PageHeader kicker="Content filter" title="This stream is hidden" subtitle="Mature and Restricted streams stay out of your feed and player while the filter is on." />
        <Link className="btn btn-primary" href="/settings">
          Review filter
        </Link>
      </div>
    );
  }
  if (data.stream.moderation_status === "suspended" && !data.staff && user?.id !== data.stream.creator) {
    return (
      <div className="card p-6">
        <PageHeader kicker="Moderation" title="This stream was suspended" subtitle="A moderator removed it from the live feed." />
        <Link className="btn" href="/home">
          Back to live
        </Link>
      </div>
    );
  }
  const kind = gateKind(data.stream);
  const skip = data.staff || user?.id === data.stream.creator;
  const acked = await hasAcknowledged(id);
  if (kind !== "none" && !skip && !acked) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center">
        <ContentGate stream={data.stream} needsAge={query.gate === "age"} />
      </div>
    );
  }
  const messages = data.state && "messages" in data.state ? (data.state.messages ?? []) : [];
  return (
    <StreamRoom
      stream={data.stream}
      creator={data.creator}
      viewer={user ? toPublicUser(user) : null}
      following={data.following}
      balance={user?.coin_balance ?? 0}
      initialMessages={messages}
      gifts={data.gifts}
    />
  );
}
