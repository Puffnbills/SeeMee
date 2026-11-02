import {
  CATEGORY_CATALOG,
  COIN_PACKAGES,
  COIN_USD,
  GIFT_CATALOG,
  LANGUAGES,
  PLACES,
  RATING_CATALOG,
  isAdultRating,
} from "./constants";
import { parseTags, slug } from "./format";
import type {
  ChatMessage,
  Database,
  Notification,
  PublicGiftEvent,
  PublicMessage,
  PublicUser,
  Report,
  ReportReason,
  ReportStatus,
  Result,
  Stream,
  User,
  UserRole,
} from "./types";
import { fail, ok } from "./types";

export interface StartStreamInput {
  title: string;
  description: string;
  category: string;
  language: string;
  content_rating: string;
  sensitive_content_warning: boolean;
  sexual_content: boolean;
  includes_nudity: boolean;
  location: string;
}

export function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function isStaff(user: Pick<User, "role" | "banned"> | null | undefined) {
  return !!user && !user.banned && (user.role === "moderator" || user.role === "administrator");
}

export function isAdmin(user: Pick<User, "role" | "banned"> | null | undefined) {
  return !!user && !user.banned && user.role === "administrator";
}

export function canGoLive(role: UserRole) {
  return role === "creator" || role === "administrator";
}

export function isAdultStream(stream: Pick<Stream, "content_rating" | "sexual_content" | "includes_nudity">) {
  return isAdultRating(stream.content_rating) || stream.sexual_content || stream.includes_nudity;
}

export function hiddenByFilter(stream: Stream, user: User | null) {
  if (!user?.content_filter_enabled) return false;
  if (isStaff(user) || user.id === stream.creator) return false;
  return isAdultStream(stream);
}

export function passesContentFilter(stream: Stream, user: User | null) {
  return !hiddenByFilter(stream, user);
}

export type GateKind = "none" | "sensitive" | "adult";

export function gateKind(stream: Stream): GateKind {
  if (isAdultStream(stream)) return "adult";
  if (stream.sensitive_content_warning) return "sensitive";
  return "none";
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar: user.avatar,
    bio: user.bio,
    verified: user.verified,
    followers_count: user.followers_count,
    following_count: user.following_count,
    total_streams: user.total_streams,
    total_views: user.total_views,
    created_date: user.created_date,
    role: user.role,
  };
}

export function syncDenormalized(db: Database) {
  const followers = new Map<string, number>();
  const following = new Map<string, number>();
  for (const row of db.follows) {
    followers.set(row.creator, (followers.get(row.creator) ?? 0) + 1);
    following.set(row.follower, (following.get(row.follower) ?? 0) + 1);
  }
  for (const user of db.users) {
    user.followers_count = followers.get(user.id) ?? 0;
    user.following_count = following.get(user.id) ?? 0;
    user.total_streams = db.streams.filter((stream) => stream.creator === user.id).length;
  }
  for (const category of db.categories) {
    category.active_streams = db.streams.filter(
      (stream) =>
        stream.category === category.name &&
        stream.status === "Live" &&
        stream.moderation_status === "active",
    ).length;
  }
}

export function syncRevenue(db: Database) {
  for (const user of db.users) {
    const received = db.giftTransactions
      .filter((gift) => gift.receiver === user.id)
      .reduce((sum, gift) => {
        const refunded = db.walletTransactions.some(
          (row) => row.external_id === `refund:${gift.id}:receiver`,
        );
        return sum + (refunded ? 0 : gift.coins_spent);
      }, 0);
    user.total_revenue = Math.round(received * COIN_USD * 100) / 100;
  }
}

function notify(db: Database, input: Omit<Notification, "id" | "created_at" | "read">) {
  db.notifications.push({
    id: nid("ntf"),
    read: false,
    created_at: new Date().toISOString(),
    ...input,
  });
}

function findUser(db: Database, id: string) {
  return db.users.find((user) => user.id === id) ?? null;
}

export function activeUser(db: Database, id: string) {
  const user = findUser(db, id);
  if (!user || user.banned) return null;
  return user;
}

export function performSignUp(
  db: Database,
  input: { email: string; username: string; display_name: string },
): Result<User> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const display_name = input.display_name.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email.");
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return fail("Usernames are 3–20 characters: lowercase letters, numbers, underscore.");
  }
  if (display_name.length < 2 || display_name.length > 40) return fail("Display name must be 2–40 characters.");
  if (db.users.some((user) => user.email.toLowerCase() === email)) return fail("That email already has an account.");
  if (db.users.some((user) => user.username.toLowerCase() === username)) return fail("That username is taken.");
  const user: User = {
    id: nid("user"),
    username,
    display_name,
    email,
    avatar: "rose",
    bio: "",
    verified: false,
    coin_balance: 100,
    followers_count: 0,
    following_count: 0,
    total_streams: 0,
    total_views: 0,
    total_revenue: 0,
    stripe_customer_id: null,
    content_filter_enabled: true,
    role: "viewer",
    created_date: new Date().toISOString(),
    banned: false,
    warning_count: 0,
  };
  db.users.push(user);
  notify(db, {
    recipient: user.id,
    type: "Announcement",
    title: "Welcome to SeeMee",
    body: "You have 100 starter coins. Your content filter hides Mature and Restricted streams until you turn it off.",
    link: "/settings",
  });
  return ok(user);
}

export function performOAuthSignIn(
  db: Database,
  input: { email: string; display_name: string; avatar?: string | null },
): Result<User> {
  const email = input.email.trim().toLowerCase();
  if (!email) return fail("The provider did not return an email.");
  const existing = db.users.find((user) => user.email.toLowerCase() === email);
  if (existing) {
    if (existing.banned) return fail("This account is banned.");
    return ok(existing);
  }
  const base = email.split("@")[0]?.replace(/[^a-z0-9_]/gi, "").toLowerCase().slice(0, 16) || "member";
  let username = base.length >= 3 ? base : `${base}user`;
  let n = 2;
  while (db.users.some((user) => user.username === username)) {
    username = `${base.slice(0, 12)}${n}`;
    n += 1;
  }
  return performSignUp(db, {
    email,
    username,
    display_name: input.display_name.trim() || username,
  });
}

export function findUserByEmail(db: Database, email: string) {
  const needle = email.trim().toLowerCase();
  return db.users.find((user) => user.email.toLowerCase() === needle) ?? null;
}

export function findUserByUsername(db: Database, username: string) {
  const needle = username.trim().toLowerCase();
  return db.users.find((user) => user.username.toLowerCase() === needle) ?? null;
}

function applyRatingRules(input: StartStreamInput): Result<StartStreamInput> {
  const next = { ...input };
  const rating = RATING_CATALOG.find((item) => item.name === next.content_rating);
  if (!rating) return fail("Choose a content rating.");
  if (!CATEGORY_CATALOG.some((item) => item.name === next.category)) return fail("Choose a category.");
  if (!LANGUAGES.some((item) => item.code === next.language)) return fail("Choose a language.");
  if (rating.name.startsWith("Mature")) {
    next.sexual_content = true;
    next.sensitive_content_warning = true;
  }
  if (rating.name.startsWith("Restricted")) {
    next.sexual_content = true;
    next.includes_nudity = true;
    next.sensitive_content_warning = true;
  }
  if ((next.sexual_content || next.includes_nudity) && !isAdultRating(rating.name)) {
    return fail("Sexual content and nudity must use Mature (18+) or Restricted Content.");
  }
  if (next.sexual_content || next.includes_nudity) next.sensitive_content_warning = true;
  return ok(next);
}

export function performStartStream(db: Database, actorId: string, raw: StartStreamInput): Result<Stream> {
  const actor = activeUser(db, actorId);
  if (!actor) return fail("Sign in required.");
  if (!canGoLive(actor.role)) return fail("Only creators and administrators can go live.");
  const title = raw.title.trim();
  const description = raw.description.trim();
  if (title.length < 3 || title.length > 80) return fail("Title must be 3–80 characters.");
  if (description.length > 500) return fail("Description must be 500 characters or fewer.");
  const checked = applyRatingRules({ ...raw, title, description });
  if (!checked.ok) return checked;
  const input = checked.data;
  if (
    db.streams.some(
      (stream) => stream.creator === actor.id && stream.status === "Live" && stream.moderation_status === "active",
    )
  ) {
    return fail("You already have a live stream. End it before starting another.");
  }
  const place = PLACES.find((item) => item.name.toLowerCase() === input.location.trim().toLowerCase());
  const location = place?.name ?? (input.location.trim() || "Remote");
  const stream: Stream = {
    id: nid("stream"),
    title,
    description,
    category: input.category,
    creator: actor.id,
    status: "Live",
    stream_room_id: `seemee_${actor.username}_${slug(title)}_${nid("room").slice(-6)}`,
    thumbnail: "",
    viewer_count: 0,
    peak_viewers: 0,
    total_watch_time: 0,
    replay_url: null,
    content_rating: input.content_rating,
    sensitive_content_warning: input.sensitive_content_warning,
    includes_nudity: input.includes_nudity,
    sexual_content: input.sexual_content,
    language: input.language,
    location,
    latitude: place?.latitude ?? null,
    longitude: place?.longitude ?? null,
    tags: parseTags(`${title} ${description}`),
    moderation_status: "active",
    ingest_url: null,
    cloudflare_input_id: null,
    started_at: new Date().toISOString(),
    ended_at: null,
  };
  const thumb: Record<string, string> = {
    Music: "grad:violet",
    Gaming: "grad:iris",
    "Just Chatting": "grad:rose",
    Art: "grad:gold",
    Fitness: "grad:lime",
    IRL: "grad:sea",
    Comedy: "grad:ember",
    Education: "grad:sky",
    Nightlife: "grad:wine",
  };
  stream.thumbnail = thumb[stream.category] ?? "grad:violet";
  db.streams.push(stream);
  syncDenormalized(db);
  for (const follow of db.follows.filter((row) => row.creator === actor.id)) {
    notify(db, {
      recipient: follow.follower,
      type: "Live Alert",
      title: `${actor.display_name} is live`,
      body: stream.title,
      link: `/stream/${stream.id}`,
    });
  }
  return ok(stream);
}

export function attachIngest(
  db: Database,
  streamId: string,
  input: { uid: string; ingestUrl: string; playbackUrl: string | null },
) {
  const stream = db.streams.find((item) => item.id === streamId);
  if (!stream) return;
  stream.cloudflare_input_id = input.uid;
  stream.ingest_url = input.ingestUrl || null;
  if (input.playbackUrl) stream.replay_url = input.playbackUrl;
}

export function performEndStream(db: Database, actorId: string, streamId: string): Result<Stream> {
  const actor = activeUser(db, actorId);
  const stream = db.streams.find((item) => item.id === streamId);
  if (!actor || !stream) return fail("Stream not found.");
  if (stream.creator !== actor.id && !isStaff(actor)) return fail("You cannot end this stream.");
  if (stream.status !== "Live") return fail("This stream is not live.");
  stream.status = "Ended";
  stream.ended_at = new Date().toISOString();
  stream.viewer_count = 0;
  syncDenormalized(db);
  return ok(stream);
}

export function performUpdateStream(
  db: Database,
  actorId: string,
  streamId: string,
  raw: Partial<StartStreamInput>,
): Result<Stream> {
  const actor = activeUser(db, actorId);
  const stream = db.streams.find((item) => item.id === streamId);
  if (!actor || !stream) return fail("Stream not found.");
  if (stream.creator !== actor.id && !isAdmin(actor)) return fail("Creators control their own stream settings.");
  const merged: StartStreamInput = {
    title: raw.title ?? stream.title,
    description: raw.description ?? stream.description,
    category: raw.category ?? stream.category,
    language: raw.language ?? stream.language,
    content_rating: raw.content_rating ?? stream.content_rating,
    sensitive_content_warning: raw.sensitive_content_warning ?? stream.sensitive_content_warning,
    sexual_content: raw.sexual_content ?? stream.sexual_content,
    includes_nudity: raw.includes_nudity ?? stream.includes_nudity,
    location: raw.location ?? stream.location,
  };
  const checked = applyRatingRules(merged);
  if (!checked.ok) return checked;
  const input = checked.data;
  if (input.title.trim().length < 3) return fail("Title must be 3–80 characters.");
  stream.title = input.title.trim();
  stream.description = input.description.trim();
  stream.category = input.category;
  stream.language = input.language;
  stream.content_rating = input.content_rating;
  stream.sensitive_content_warning = input.sensitive_content_warning;
  stream.sexual_content = input.sexual_content;
  stream.includes_nudity = input.includes_nudity;
  stream.tags = parseTags(`${stream.title} ${stream.description}`);
  const place = PLACES.find((item) => item.name.toLowerCase() === input.location.trim().toLowerCase());
  if (place) {
    stream.location = place.name;
    stream.latitude = place.latitude;
    stream.longitude = place.longitude;
  }
  syncDenormalized(db);
  return ok(stream);
}

export function performJoin(db: Database, streamId: string): Result<{ counted: boolean }> {
  const stream = db.streams.find((item) => item.id === streamId);
  if (!stream || stream.status !== "Live" || stream.moderation_status !== "active") return ok({ counted: false });
  stream.viewer_count += 1;
  if (stream.viewer_count > stream.peak_viewers) stream.peak_viewers = stream.viewer_count;
  const creator = findUser(db, stream.creator);
  if (creator) creator.total_views += 1;
  return ok({ counted: true });
}

export function performHeartbeat(db: Database, userId: string | null, streamId: string, seconds: number) {
  const stream = db.streams.find((item) => item.id === streamId);
  if (!stream || stream.status !== "Live" || stream.moderation_status !== "active") return;
  if (!userId || userId === stream.creator) return;
  const tick = Math.max(1, Math.min(30, Math.floor(seconds)));
  stream.total_watch_time += tick;
}

export function performChat(db: Database, actorId: string, streamId: string, text: string): Result<PublicMessage> {
  const actor = activeUser(db, actorId);
  const stream = db.streams.find((item) => item.id === streamId);
  if (!actor) return fail("Sign in to chat.");
  if (!stream) return fail("Stream not found.");
  if (stream.status !== "Live" || stream.moderation_status !== "active") return fail("Chat is open while the stream is live.");
  if (!passesContentFilter(stream, actor)) return fail("This stream is hidden by your content filter.");
  const message = text.trim();
  if (message.length < 1 || message.length > 280) return fail("Messages are 1–280 characters.");
  const row: ChatMessage = {
    id: nid("msg"),
    stream: stream.id,
    sender: actor.id,
    message,
    created_at: new Date().toISOString(),
    removed: false,
  };
  db.messages.push(row);
  return ok(presentMessage(db, row)!);
}

export function performGift(
  db: Database,
  actorId: string,
  streamId: string,
  giftId: string,
): Result<{ balance: number; event: PublicGiftEvent }> {
  const actor = activeUser(db, actorId);
  const stream = db.streams.find((item) => item.id === streamId);
  const gift = db.gifts.find((item) => item.id === giftId);
  if (!actor) return fail("Sign in to send a gift.");
  if (!stream || !gift) return fail("Gift or stream not found.");
  if (stream.status !== "Live" || stream.moderation_status !== "active") return fail("Gifts can be sent on a live stream.");
  if (stream.creator === actor.id) return fail("You cannot gift your own stream.");
  if (!passesContentFilter(stream, actor)) return fail("This stream is hidden by your content filter.");
  if (actor.coin_balance < gift.coin_cost) return fail("Not enough coins. Buy a pack in your wallet.");
  const receiver = findUser(db, stream.creator);
  if (!receiver || receiver.banned) return fail("This creator cannot receive gifts.");
  const amount = Math.round(gift.coin_cost * COIN_USD * 100) / 100;
  const now = new Date().toISOString();
  actor.coin_balance -= gift.coin_cost;
  receiver.coin_balance += gift.coin_cost;
  db.walletTransactions.push(
    {
      id: nid("wal"),
      user: actor.id,
      transaction_type: "Gift Sent",
      coins: -gift.coin_cost,
      amount,
      external_id: null,
      created_at: now,
    },
    {
      id: nid("wal"),
      user: receiver.id,
      transaction_type: "Gift Received",
      coins: gift.coin_cost,
      amount,
      external_id: null,
      created_at: now,
    },
  );
  const transaction = {
    id: nid("gtx"),
    sender: actor.id,
    receiver: receiver.id,
    stream: stream.id,
    gift: gift.id,
    coins_spent: gift.coin_cost,
    created_at: now,
  };
  db.giftTransactions.push(transaction);
  syncRevenue(db);
  notify(db, {
    recipient: receiver.id,
    type: "Gift Received",
    title: `${gift.icon} ${gift.name}`,
    body: `${actor.display_name} sent ${gift.name} on ${stream.title}.`,
    link: `/stream/${stream.id}`,
  });
  return ok({
    balance: actor.coin_balance,
    event: {
      id: transaction.id,
      gift_name: gift.name,
      icon: gift.icon,
      animation_url: gift.animation_url,
      sender_name: actor.display_name,
      created_at: now,
    },
  });
}

export function performPurchase(
  db: Database,
  actorId: string,
  packageId: string,
  externalId: string | null,
  stripeCustomerId?: string | null,
): Result<{ balance: number; already: boolean }> {
  const actor = findUser(db, actorId);
  const pack = COIN_PACKAGES.find((item) => item.id === packageId);
  if (!actor || actor.banned) return fail("Account not found.");
  if (!pack) return fail("Unknown coin pack.");
  if (externalId && db.walletTransactions.some((row) => row.external_id === externalId)) {
    return ok({ balance: actor.coin_balance, already: true });
  }
  actor.coin_balance += pack.coins;
  if (stripeCustomerId && !actor.stripe_customer_id) actor.stripe_customer_id = stripeCustomerId;
  db.walletTransactions.push({
    id: nid("wal"),
    user: actor.id,
    transaction_type: "Purchase",
    coins: pack.coins,
    amount: pack.amount,
    external_id: externalId,
    created_at: new Date().toISOString(),
  });
  notify(db, {
    recipient: actor.id,
    type: "Announcement",
    title: "Coins added",
    body: `${pack.coins} coins (${pack.name}) are in your wallet.`,
    link: "/wallet",
  });
  return ok({ balance: actor.coin_balance, already: false });
}

export function performFollow(db: Database, actorId: string, creatorId: string): Result<{ following: boolean }> {
  const actor = activeUser(db, actorId);
  const creator = findUser(db, creatorId);
  if (!actor || !creator || creator.banned) return fail("User not found.");
  if (actor.id === creator.id) return fail("You cannot follow yourself.");
  const existing = db.follows.find((row) => row.follower === actor.id && row.creator === creator.id);
  if (existing) {
    db.follows = db.follows.filter((row) => row.id !== existing.id);
    syncDenormalized(db);
    return ok({ following: false });
  }
  db.follows.push({
    id: nid("fol"),
    follower: actor.id,
    creator: creator.id,
    created_at: new Date().toISOString(),
  });
  syncDenormalized(db);
  notify(db, {
    recipient: creator.id,
    type: "New Follower",
    title: "New follower",
    body: `${actor.display_name} followed you.`,
    link: `/u/${actor.username}`,
  });
  return ok({ following: true });
}

export function performReport(
  db: Database,
  actorId: string,
  input: {
    reason: ReportReason;
    reported_user?: string | null;
    reported_stream?: string | null;
    reported_message?: string | null;
  },
): Result<Report> {
  const actor = activeUser(db, actorId);
  if (!actor) return fail("Sign in to report.");
  if (!["Spam", "Harassment", "Violence", "Copyright"].includes(input.reason)) return fail("Choose a reason.");
  const reported_user = input.reported_user || null;
  const reported_stream = input.reported_stream || null;
  const reported_message = input.reported_message || null;
  if (!reported_user && !reported_stream && !reported_message) return fail("Nothing to report.");
  if (reported_user && !findUser(db, reported_user)) return fail("User not found.");
  if (reported_stream && !db.streams.some((stream) => stream.id === reported_stream)) return fail("Stream not found.");
  const message = reported_message ? db.messages.find((item) => item.id === reported_message) : null;
  if (reported_message && !message) return fail("Message not found.");
  const report: Report = {
    id: nid("rpt"),
    reporter: actor.id,
    reported_user: reported_user ?? message?.sender ?? null,
    reported_stream: reported_stream ?? message?.stream ?? null,
    reported_message,
    reason: input.reason,
    status: "Open",
    created_at: new Date().toISOString(),
  };
  db.reports.push(report);
  for (const staff of db.users.filter((user) => isStaff(user))) {
    notify(db, {
      recipient: staff.id,
      type: "Moderator Action",
      title: "New report",
      body: `${actor.display_name} reported ${input.reason.toLowerCase()}.`,
      link: "/moderation",
    });
  }
  return ok(report);
}

export function performSettings(
  db: Database,
  actorId: string,
  input: { display_name: string; bio: string; avatar: string; content_filter_enabled: boolean },
): Result<User> {
  const actor = activeUser(db, actorId);
  if (!actor) return fail("Sign in required.");
  const display_name = input.display_name.trim();
  const bio = input.bio.trim();
  if (display_name.length < 2 || display_name.length > 40) return fail("Display name must be 2–40 characters.");
  if (bio.length > 280) return fail("Bio must be 280 characters or fewer.");
  const avatars = ["rose", "iris", "gold", "sea", "lime", "ember", "sky", "wine"];
  if (!avatars.includes(input.avatar) && !input.avatar.startsWith("http")) return fail("Choose an avatar.");
  actor.display_name = display_name;
  actor.bio = bio;
  actor.avatar = input.avatar;
  actor.content_filter_enabled = input.content_filter_enabled;
  return ok(actor);
}

export function performMarkRead(db: Database, actorId: string, notificationId?: string) {
  for (const note of db.notifications) {
    if (note.recipient !== actorId) continue;
    if (!notificationId || note.id === notificationId) note.read = true;
  }
}

type ModCommand =
  | { type: "status"; reportId: string; status: ReportStatus }
  | { type: "remove_message"; messageId: string; reportId?: string }
  | { type: "suspend_stream"; streamId: string; reportId?: string }
  | { type: "warn"; userId: string; reportId?: string }
  | { type: "ban"; userId: string }
  | { type: "unban"; userId: string }
  | { type: "refund"; giftTransactionId: string };

export function performModerate(db: Database, actorId: string, command: ModCommand): Result<{ notice: string }> {
  const actor = activeUser(db, actorId);
  if (!actor || !isStaff(actor)) return fail("Moderators only.");
  if (command.type === "ban" || command.type === "unban" || command.type === "refund") {
    if (!isAdmin(actor)) return fail("Administrators only.");
  }
  const touchReport = (reportId?: string, status?: ReportStatus) => {
    if (!reportId) return;
    const report = db.reports.find((item) => item.id === reportId);
    if (!report) return;
    if (status) report.status = status;
    else if (report.status === "Open") report.status = "Under Review";
  };

  if (command.type === "status") {
    const report = db.reports.find((item) => item.id === command.reportId);
    if (!report) return fail("Report not found.");
    report.status = command.status;
    if (command.status === "Resolved" || command.status === "Rejected") {
      notify(db, {
        recipient: report.reporter,
        type: "Moderator Action",
        title: `Report ${command.status.toLowerCase()}`,
        body: `Your ${report.reason.toLowerCase()} report is ${command.status.toLowerCase()}.`,
        link: null,
      });
    }
    return ok({ notice: `Report marked ${command.status}.` });
  }

  if (command.type === "remove_message") {
    const message = db.messages.find((item) => item.id === command.messageId);
    if (!message) return fail("Message not found.");
    message.removed = true;
    touchReport(command.reportId);
    notify(db, {
      recipient: message.sender,
      type: "Moderator Action",
      title: "Message removed",
      body: "A moderator removed one of your chat messages.",
      link: `/stream/${message.stream}`,
    });
    return ok({ notice: "Message removed." });
  }

  if (command.type === "suspend_stream") {
    const stream = db.streams.find((item) => item.id === command.streamId);
    if (!stream) return fail("Stream not found.");
    stream.moderation_status = "suspended";
    if (stream.status === "Live") {
      stream.status = "Ended";
      stream.ended_at = new Date().toISOString();
      stream.viewer_count = 0;
    }
    syncDenormalized(db);
    touchReport(command.reportId);
    notify(db, {
      recipient: stream.creator,
      type: "Moderator Action",
      title: "Stream suspended",
      body: `${stream.title} was suspended.`,
      link: `/stream/${stream.id}`,
    });
    return ok({ notice: "Stream suspended." });
  }

  if (command.type === "warn") {
    const target = findUser(db, command.userId);
    if (!target) return fail("User not found.");
    target.warning_count += 1;
    touchReport(command.reportId);
    notify(db, {
      recipient: target.id,
      type: "Moderator Action",
      title: "Moderator warning",
      body: "A moderator warned your account. Further reports can lead to a suspension.",
      link: "/settings",
    });
    return ok({ notice: "Warning sent." });
  }

  if (command.type === "ban" || command.type === "unban") {
    const target = findUser(db, command.userId);
    if (!target) return fail("User not found.");
    if (target.role === "administrator" && target.id !== actor.id) return fail("You cannot ban another administrator.");
    target.banned = command.type === "ban";
    if (target.banned) {
      for (const stream of db.streams.filter((item) => item.creator === target.id && item.status === "Live")) {
        stream.status = "Ended";
        stream.ended_at = new Date().toISOString();
        stream.viewer_count = 0;
        stream.moderation_status = "suspended";
      }
      notify(db, {
        recipient: target.id,
        type: "Moderator Action",
        title: "Account banned",
        body: "An administrator banned this account.",
        link: null,
      });
    }
    syncDenormalized(db);
    return ok({ notice: target.banned ? "User banned." : "User unbanned." });
  }

  const giftTx = db.giftTransactions.find((item) => item.id === command.giftTransactionId);
  if (!giftTx) return fail("Gift transaction not found.");
  if (db.walletTransactions.some((row) => row.external_id === `refund:${giftTx.id}:sender`)) {
    return fail("This gift was already refunded.");
  }
  const sender = findUser(db, giftTx.sender);
  const receiver = findUser(db, giftTx.receiver);
  if (!sender || !receiver) return fail("User not found.");
  if (receiver.coin_balance < giftTx.coins_spent) return fail("Creator balance is too low to refund this gift.");
  const amount = Math.round(giftTx.coins_spent * COIN_USD * 100) / 100;
  const now = new Date().toISOString();
  sender.coin_balance += giftTx.coins_spent;
  receiver.coin_balance -= giftTx.coins_spent;
  db.walletTransactions.push(
    {
      id: nid("wal"),
      user: sender.id,
      transaction_type: "Refund",
      coins: giftTx.coins_spent,
      amount,
      external_id: `refund:${giftTx.id}:sender`,
      created_at: now,
    },
    {
      id: nid("wal"),
      user: receiver.id,
      transaction_type: "Refund",
      coins: -giftTx.coins_spent,
      amount,
      external_id: `refund:${giftTx.id}:receiver`,
      created_at: now,
    },
  );
  syncRevenue(db);
  notify(db, {
    recipient: sender.id,
    type: "Announcement",
    title: "Gift refunded",
    body: `${giftTx.coins_spent} coins were returned to your wallet.`,
    link: "/wallet",
  });
  return ok({ notice: "Gift refunded." });
}

export function discoveryStreams(db: Database, user: User | null) {
  return db.streams.filter(
    (stream) => stream.moderation_status === "active" && passesContentFilter(stream, user),
  );
}

export function hiddenAdultCount(db: Database, user: User | null) {
  if (!user?.content_filter_enabled || isStaff(user)) return 0;
  return db.streams.filter(
    (stream) => stream.status === "Live" && stream.moderation_status === "active" && isAdultStream(stream),
  ).length;
}

export function feedFor(db: Database, user: User | null, tab: string, category?: string) {
  const visible = discoveryStreams(db, user);
  const live = visible.filter((stream) => stream.status === "Live");
  if (tab === "trending") return [...live].sort((a, b) => b.viewer_count - a.viewer_count);
  if (tab === "newest") return [...visible].sort((a, b) => b.started_at.localeCompare(a.started_at));
  if (tab === "following") {
    if (!user) return [];
    const ids = new Set(db.follows.filter((row) => row.follower === user.id).map((row) => row.creator));
    return live.filter((stream) => ids.has(stream.creator)).sort((a, b) => b.viewer_count - a.viewer_count);
  }
  if (tab === "category") {
    const pool = category ? live.filter((stream) => stream.category === category) : live;
    return [...pool].sort((a, b) => b.viewer_count - a.viewer_count);
  }
  if (tab === "location" || tab === "map") return [...live].sort((a, b) => a.location.localeCompare(b.location));
  return [...live].sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export function searchAll(db: Database, user: User | null, q: string) {
  const query = q.trim().toLowerCase();
  const hash = query.startsWith("#") ? query.slice(1) : query;
  const visible = discoveryStreams(db, user);
  const streams = query
    ? visible.filter((stream) => {
        const hay = `${stream.title} ${stream.description} ${stream.category} ${stream.tags.join(" ")}`.toLowerCase();
        return hay.includes(hash) || stream.tags.includes(hash);
      })
    : [];
  const users = query
    ? db.users.filter(
        (person) =>
          !person.banned &&
          (person.username.toLowerCase().includes(query) || person.display_name.toLowerCase().includes(query)),
      )
    : [];
  const tags = [
    ...new Set(visible.flatMap((stream) => stream.tags).filter((tag) => !query || tag.includes(hash))),
  ].slice(0, 24);
  const categories = db.categories.filter((category) => !query || category.name.toLowerCase().includes(query));
  return { streams, users, tags, categories };
}

export function analyticsFor(db: Database, userId: string) {
  const user = findUser(db, userId);
  const streams = db.streams.filter((stream) => stream.creator === userId);
  const gifts = db.giftTransactions.filter((gift) => gift.receiver === userId && !refunded(db, gift.id));
  const spent = db.walletTransactions.filter((row) => row.user === userId && row.transaction_type === "Gift Sent");
  return {
    followers: user?.followers_count ?? 0,
    views: user?.total_views ?? 0,
    peak_viewers: streams.reduce((max, stream) => Math.max(max, stream.peak_viewers), 0),
    watch_time: streams.reduce((sum, stream) => sum + stream.total_watch_time, 0),
    gifts_received: gifts.length,
    coins_received: gifts.reduce((sum, gift) => sum + gift.coins_spent, 0),
    coins_spent: Math.abs(spent.reduce((sum, row) => sum + row.coins, 0)),
    revenue: user?.total_revenue ?? 0,
  };
}

function refunded(db: Database, giftId: string) {
  return db.walletTransactions.some((row) => row.external_id === `refund:${giftId}:receiver`);
}

export function platformAnalytics(db: Database) {
  const live = db.streams.filter((stream) => stream.status === "Live" && stream.moderation_status === "active");
  return {
    live_streams: live.length,
    users: db.users.length,
    open_reports: db.reports.filter((report) => report.status === "Open" || report.status === "Under Review").length,
    gifts: db.giftTransactions.length,
    coins_spent: Math.abs(
      db.walletTransactions
        .filter((row) => row.transaction_type === "Gift Sent")
        .reduce((sum, row) => sum + row.coins, 0),
    ),
    revenue: Math.round(db.users.reduce((sum, user) => sum + user.total_revenue, 0) * 100) / 100,
    watch_time: db.streams.reduce((sum, stream) => sum + stream.total_watch_time, 0),
    peak_viewers: db.streams.reduce((max, stream) => Math.max(max, stream.peak_viewers), 0),
  };
}

function presentMessage(db: Database, message: ChatMessage): PublicMessage | null {
  const sender = findUser(db, message.sender);
  if (!sender) return null;
  return {
    id: message.id,
    message: message.removed ? "Removed by a moderator" : message.message,
    created_at: message.created_at,
    removed: message.removed,
    sender: {
      id: sender.id,
      username: sender.username,
      display_name: sender.display_name,
      avatar: sender.avatar,
    },
  };
}

export function buildStreamState(db: Database, streamId: string, user: User | null) {
  const stream = db.streams.find((item) => item.id === streamId);
  if (!stream) return null;
  if (!passesContentFilter(stream, user)) return { forbidden: true as const };
  const staff = isStaff(user);
  if (stream.moderation_status === "suspended" && !staff && user?.id !== stream.creator) {
    return { suspended: true as const, status: stream.status, moderation_status: stream.moderation_status };
  }
  const cutoff = Date.now() - 30_000;
  const messages = db.messages
    .filter((message) => message.stream === stream.id && (!message.removed || staff))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((message) => presentMessage(db, message))
    .filter((message): message is PublicMessage => !!message);
  const recent_gifts: PublicGiftEvent[] = db.giftTransactions
    .filter((gift) => gift.stream === stream.id && Date.parse(gift.created_at) >= cutoff)
    .map((gift) => {
      const catalog = db.gifts.find((item) => item.id === gift.gift);
      const sender = findUser(db, gift.sender);
      return {
        id: gift.id,
        gift_name: catalog?.name ?? "Gift",
        icon: catalog?.icon ?? "🎁",
        animation_url: catalog?.animation_url ?? "",
        sender_name: sender?.display_name ?? "Someone",
        created_at: gift.created_at,
      };
    });
  return {
    forbidden: false as const,
    suspended: false as const,
    viewer_count: stream.viewer_count,
    status: stream.status,
    moderation_status: stream.moderation_status,
    messages,
    recent_gifts,
  };
}

export function profileStreams(db: Database, profileId: string, viewer: User | null) {
  const staff = isStaff(viewer);
  return db.streams
    .filter((stream) => stream.creator === profileId)
    .filter((stream) => (stream.moderation_status === "suspended" ? staff || viewer?.id === profileId : true))
    .filter((stream) => passesContentFilter(stream, viewer))
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export function emptyCatalog(): Pick<Database, "categories" | "contentRatings" | "gifts"> {
  return {
    categories: CATEGORY_CATALOG.map((category) => ({ ...category, active_streams: 0 })),
    contentRatings: RATING_CATALOG.map((rating) => ({ ...rating })),
    gifts: GIFT_CATALOG.map((gift) => ({ ...gift })),
  };
}

export function followerIds(db: Database, creatorId: string) {
  return db.follows.filter((row) => row.creator === creatorId).map((row) => row.follower);
}

export { GIFT_CATALOG };
