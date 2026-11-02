import { FollowButton } from "@/components/follow-button";
import { StreamGrid } from "@/components/stream-card";
import { Avatar, Day, Empty, PageHeader, Verified } from "@/components/ui";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { duration, money } from "@/lib/format";
import { analyticsFor, isStaff, profileStreams, toPublicUser } from "@/lib/logic";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const data = await read((db) => {
    const user = db.users.find((person) => person.username.toLowerCase() === username.toLowerCase());
    if (!user) return null;
    const streams = profileStreams(db, user.id, viewer);
    const hidden = db.streams.filter((stream) => stream.creator === user.id).length - streams.length;
    return {
      user,
      publicUser: toPublicUser(user),
      streams,
      hidden,
      analytics: analyticsFor(db, user.id),
      following: viewer ? db.follows.some((row) => row.follower === viewer.id && row.creator === user.id) : false,
      creators: { [user.id]: toPublicUser(user) },
    };
  });
  if (!data) notFound();
  if (data.user.banned && !isStaff(viewer)) notFound();
  const owner = viewer?.id === data.user.id;
  const showAnalytics = owner || isStaff(viewer);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar user={data.publicUser} size={72} />
          <div>
            <PageHeader
              kicker={`@${data.publicUser.username}`}
              title={data.publicUser.display_name}
              subtitle={data.publicUser.bio || "No bio yet."}
            />
            <p className="text-sm text-white/50">
              {data.publicUser.verified ? <Verified /> : null} {data.publicUser.role} · joined <Day iso={data.publicUser.created_date} />
            </p>
          </div>
        </div>
        {viewer && !owner ? <FollowButton creatorId={data.user.id} following={data.following} /> : null}
        {owner ? (
          <div className="flex gap-2">
            <Link className="btn" href="/settings">
              Edit profile
            </Link>
            <Link className="btn btn-primary" href="/go-live">
              Go live
            </Link>
          </div>
        ) : null}
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="card stat"><b>{data.publicUser.followers_count}</b><span className="text-sm text-white/50">Followers</span></div>
        <div className="card stat"><b>{data.publicUser.following_count}</b><span className="text-sm text-white/50">Following</span></div>
        <div className="card stat"><b>{data.publicUser.total_streams}</b><span className="text-sm text-white/50">Streams</span></div>
        <div className="card stat"><b>{data.publicUser.total_views}</b><span className="text-sm text-white/50">Views</span></div>
      </div>
      {showAnalytics ? (
        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="card stat"><b>{data.analytics.peak_viewers}</b><span className="text-sm text-white/50">Peak viewers</span></div>
          <div className="card stat"><b>{duration(data.analytics.watch_time)}</b><span className="text-sm text-white/50">Watch time</span></div>
          <div className="card stat"><b>{data.analytics.gifts_received}</b><span className="text-sm text-white/50">Gifts received</span></div>
          <div className="card stat"><b>{data.analytics.coins_spent}</b><span className="text-sm text-white/50">Coins spent</span></div>
          <div className="card stat"><b>{money(data.analytics.revenue)}</b><span className="text-sm text-white/50">Revenue</span></div>
        </div>
      ) : null}
      {data.hidden > 0 ? <p className="mb-3 text-sm text-white/50">Some streams are hidden by your content filter.</p> : null}
      {data.streams.length ? (
        <StreamGrid streams={data.streams} creators={data.creators} />
      ) : (
        <Empty title="No visible streams" body="Ended and live rooms show up here when the filter allows them." />
      )}
    </div>
  );
}
