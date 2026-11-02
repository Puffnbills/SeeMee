"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COIN_PACKAGES } from "./constants";
import { getCurrentUser } from "./current";
import { dataMode, mutate, read, resetMemory } from "./db";
import { safeNext } from "./format";
import { createCloudflareLiveInput } from "./integrations/cloudflare";
import { pushNotify } from "./integrations/onesignal";
import { fulfillCheckoutSession, startCheckout } from "./integrations/stripe";
import {
  attachIngest,
  followerIds,
  performChat,
  performEndStream,
  performFollow,
  performGift,
  performMarkRead,
  performModerate,
  performOAuthSignIn,
  performPurchase,
  performReport,
  performSettings,
  performSignUp,
  performStartStream,
  performUpdateStream,
  type StartStreamInput,
} from "./logic";
import { appOrigin } from "./origin";
import { pushReaction } from "./reactions";
import { acknowledge, clearSession, setSession } from "./session";
import { fail, type ReportReason, type ReportStatus } from "./types";

export type ActionState = { ok: false; error: string } | { ok: true; message: string } | null;

function refresh() {
  revalidatePath("/", "layout");
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function streamInput(formData: FormData): StartStreamInput {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? ""),
    language: String(formData.get("language") ?? "en"),
    content_rating: String(formData.get("content_rating") ?? ""),
    sensitive_content_warning: checked(formData, "sensitive_content_warning"),
    sexual_content: checked(formData, "sexual_content"),
    includes_nudity: checked(formData, "includes_nudity"),
    location: String(formData.get("location") ?? ""),
  };
}

export async function demoSignInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const next = safeNext(formData.get("next"));
  const user = await read((db) => db.users.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? null);
  if (!user) redirect(`/login?error=${encodeURIComponent("Unknown demo account.")}`);
  if (user.banned) redirect(`/login?error=${encodeURIComponent("This account is banned.")}`);
  await setSession(user.id);
  refresh();
  redirect(next);
}

export async function emailAuthAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const mode = String(formData.get("mode") ?? "login");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (password.length < 4) return { ok: false, error: "Use at least 4 characters. Demo mode accepts any password." };
  if (mode === "signup") {
    const result = await mutate((db) =>
      performSignUp(db, {
        email,
        username: String(formData.get("username") ?? ""),
        display_name: String(formData.get("display_name") ?? ""),
      }),
    );
    if (!result.ok) return result;
    await setSession(result.data.id);
  } else {
    const user = await read(
      (db) => db.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase()) ?? null,
    );
    if (!user) return { ok: false, error: "No account for that email." };
    if (user.banned) return { ok: false, error: "This account is banned." };
    await setSession(user.id);
  }
  refresh();
  redirect(next);
}

export async function signOutAction() {
  await clearSession();
  refresh();
  redirect("/");
}

export async function finishOAuth(profile: { email: string; name: string; avatar?: string | null }, next: string) {
  const name = profile.name.trim().length >= 2 ? profile.name.trim() : profile.email.split("@")[0] || "Member";
  const result = await mutate((db) => performOAuthSignIn(db, { email: profile.email, display_name: name }));
  if (!result.ok) return result;
  if (profile.avatar?.startsWith("http")) {
    await mutate((db) => {
      const user = db.users.find((item) => item.id === result.data.id);
      if (user && !user.avatar.startsWith("http")) user.avatar = profile.avatar as string;
      return null;
    });
  }
  await setSession(result.data.id);
  refresh();
  return { ok: true as const, next: safeNext(next) };
}

export async function startStreamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const result = await mutate((db) => performStartStream(db, user.id, streamInput(formData)));
  if (!result.ok) return result;
  const followers = await read((db) => followerIds(db, user.id));
  await pushNotify(followers, `${user.display_name} is live`, result.data.title);
  const liveInput = await createCloudflareLiveInput(result.data.title);
  if (liveInput) await mutate((db) => attachIngest(db, result.data.id, liveInput));
  refresh();
  redirect(`/studio/${result.data.id}`);
}

export async function updateStreamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const id = String(formData.get("stream") ?? "");
  const result = await mutate((db) => performUpdateStream(db, user.id, id, streamInput(formData)));
  if (!result.ok) return result;
  refresh();
  return { ok: true as const, message: "Stream settings saved." };
}

export async function endStreamAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("stream") ?? "");
  await mutate((db) => performEndStream(db, user.id, id));
  refresh();
  redirect(`/stream/${id}`);
}

export async function sendChatAction(streamId: string, message: string) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to chat.");
  const result = await mutate((db) => performChat(db, user.id, streamId, message));
  refresh();
  return result;
}

export async function sendGiftAction(streamId: string, giftId: string) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to send a gift.");
  const result = await mutate((db) => performGift(db, user.id, streamId, giftId));
  if (result.ok) {
    const receiver = await read((db) => db.streams.find((stream) => stream.id === streamId)?.creator ?? null);
    if (receiver) await pushNotify([receiver], "Gift received", `${user.display_name} sent a gift.`);
  }
  refresh();
  return result;
}

export async function sendReactionAction(streamId: string, emoji: string) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to react.");
  const item = pushReaction(streamId, emoji);
  if (!item) return fail("Unknown reaction.");
  return { ok: true as const, data: item };
}

export async function toggleFollowAction(creatorId: string) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in to follow.");
  const result = await mutate((db) => performFollow(db, user.id, creatorId));
  if (result.ok && result.data.following) {
    await pushNotify([creatorId], "New follower", `${user.display_name} followed you.`);
  }
  refresh();
  return result;
}

export async function reportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to report." };
  const reason = String(formData.get("reason") ?? "") as ReportReason;
  const result = await mutate((db) =>
    performReport(db, user.id, {
      reason,
      reported_user: String(formData.get("reported_user") ?? "") || null,
      reported_stream: String(formData.get("reported_stream") ?? "") || null,
      reported_message: String(formData.get("reported_message") ?? "") || null,
    }),
  );
  if (!result.ok) return result;
  const staff = await read((db) =>
    db.users.filter((person) => person.role === "moderator" || person.role === "administrator").map((person) => person.id),
  );
  await pushNotify(staff, "New report", `${user.display_name} filed a ${reason} report.`);
  refresh();
  return { ok: true as const, message: "Report filed. Moderators were notified." };
}

export async function purchaseAction(formData: FormData) {
  const user = await getCurrentUser();
  const packageId = String(formData.get("package") ?? "");
  if (!user) redirect("/login?next=/wallet");
  if (!COIN_PACKAGES.some((pack) => pack.id === packageId)) redirect("/wallet?error=pack");
  const origin = await appOrigin();
  const checkout = await startCheckout({ packageId, userId: user.id, origin, email: user.email });
  if (checkout.mode === "stripe" && checkout.url) redirect(checkout.url);
  if (checkout.mode === "error") redirect("/wallet?error=pack");
  const result = await mutate((db) => performPurchase(db, user.id, packageId, null));
  if (!result.ok) redirect("/wallet?error=1");
  refresh();
  redirect(`/wallet?purchased=${packageId}`);
}

export async function applyCheckoutSession(sessionId: string) {
  const fulfilled = await fulfillCheckoutSession(sessionId);
  if (!fulfilled) return;
  await mutate((db) =>
    performPurchase(db, fulfilled.userId, fulfilled.packageId, fulfilled.externalId, fulfilled.customer),
  );
  refresh();
}

export async function settingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const result = await mutate((db) =>
    performSettings(db, user.id, {
      display_name: String(formData.get("display_name") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      avatar: String(formData.get("avatar") ?? "rose"),
      content_filter_enabled: checked(formData, "content_filter_enabled"),
    }),
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true as const, message: "Saved." };
}

export async function markNotificationsAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await mutate((db) => performMarkRead(db, user.id));
  refresh();
}

export async function acknowledgeGateAction(formData: FormData) {
  const id = String(formData.get("stream") ?? "");
  const stream = await read((db) => db.streams.find((item) => item.id === id) ?? null);
  if (!stream) redirect("/home");
  const adult =
    stream.sexual_content ||
    stream.includes_nudity ||
    stream.content_rating.startsWith("Mature") ||
    stream.content_rating.startsWith("Restricted");
  if (adult && formData.get("adult") !== "on") redirect(`/stream/${id}?gate=age`);
  await acknowledge(id);
  redirect(`/stream/${id}`);
}

export async function moderateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/moderation");
  const type = String(formData.get("type") ?? "");
  const result = await mutate((db) => {
    if (type === "status") {
      return performModerate(db, user.id, {
        type: "status",
        reportId: String(formData.get("report") ?? ""),
        status: String(formData.get("status") ?? "") as ReportStatus,
      });
    }
    if (type === "remove_message") {
      return performModerate(db, user.id, {
        type: "remove_message",
        messageId: String(formData.get("message") ?? ""),
        reportId: String(formData.get("report") ?? "") || undefined,
      });
    }
    if (type === "suspend_stream") {
      return performModerate(db, user.id, {
        type: "suspend_stream",
        streamId: String(formData.get("stream") ?? ""),
        reportId: String(formData.get("report") ?? "") || undefined,
      });
    }
    if (type === "warn") {
      return performModerate(db, user.id, {
        type: "warn",
        userId: String(formData.get("user") ?? ""),
        reportId: String(formData.get("report") ?? "") || undefined,
      });
    }
    if (type === "ban" || type === "unban") {
      return performModerate(db, user.id, { type, userId: String(formData.get("user") ?? "") });
    }
    if (type === "refund") {
      return performModerate(db, user.id, {
        type: "refund",
        giftTransactionId: String(formData.get("gift") ?? ""),
      });
    }
    return fail("Unknown moderation action.");
  });
  refresh();
  const back = safeNext(formData.get("next"));
  redirect(result.ok ? back : `${back}?error=${encodeURIComponent(result.error)}`);
}

export async function resetDemoAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "administrator") redirect("/admin?error=forbidden");
  if (dataMode() !== "memory") redirect("/admin?error=memory-only");
  resetMemory();
  refresh();
  redirect("/admin?reset=1");
}
