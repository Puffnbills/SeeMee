"use client";

import { FollowButton } from "@/components/follow-button";
import { LiveStage } from "@/components/live-stage";
import { Avatar, Stamp } from "@/components/ui";
import { reportAction, sendChatAction, sendGiftAction, sendReactionAction, type ActionState } from "@/lib/actions";
import { compact } from "@/lib/format";
import type { Gift, PublicGiftEvent, PublicMessage, PublicUser, Stream } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useActionState } from "react";

export function StreamRoom({
  stream,
  creator,
  viewer,
  following,
  balance,
  initialMessages,
  gifts,
}: {
  stream: Stream;
  creator: PublicUser;
  viewer: PublicUser | null;
  following: boolean;
  balance: number;
  initialMessages: PublicMessage[];
  gifts: Gift[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [viewers, setViewers] = useState(stream.viewer_count);
  const [coins, setCoins] = useState(balance);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [burst, setBurst] = useState<PublicGiftEvent | null>(null);
  const [floats, setFloats] = useState<Array<{ id: string; emoji: string }>>([]);
  const [reportState, reportForm, reportPending] = useActionState(reportAction, null as ActionState);
  const [messageId, setMessageId] = useState("");
  const live = stream.status === "Live" && stream.moderation_status === "active";

  async function refresh() {
    const response = await fetch(`/api/streams/${stream.id}/state`);
    if (!response.ok) return;
    const data = (await response.json()) as {
      messages: PublicMessage[];
      viewer_count: number;
      recent_gifts: PublicGiftEvent[];
      reactions?: Array<{ id: string; emoji: string }>;
    };
    setMessages(data.messages);
    setViewers(data.viewer_count);
    if (data.reactions?.length) {
      setFloats(data.reactions.slice(-4));
    }
  }

  useEffect(() => {
    if (!live) return;
    void fetch(`/api/streams/${stream.id}/join`, { method: "POST" });
    const poll = setInterval(() => void refresh(), 4000);
    const beat = setInterval(() => {
      if (viewer) void fetch(`/api/streams/${stream.id}/heartbeat`, { method: "POST" });
    }, 15000);
    return () => {
      clearInterval(poll);
      clearInterval(beat);
    };
  }, [live, stream.id, viewer]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="grid gap-3">
        <div className="relative">
          {live ? (
            <LiveStage room={stream.stream_room_id} publish={false} title={stream.title} status={stream.status} />
          ) : (
            <div className="stage">
              <div className="stage-copy">
                <p className="kicker">{stream.status}</p>
                <p>{stream.replay_url ? "Replay link is ready." : "Replay has not been published."}</p>
                {stream.replay_url ? (
                  <a className="btn mt-2" href={stream.replay_url}>
                    Open replay
                  </a>
                ) : null}
              </div>
            </div>
          )}
          {floats.map((item) => (
            <span key={item.id} className="float-emoji">
              {item.emoji}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/u/${creator.username}`} className="flex items-center gap-2">
            <Avatar user={creator} />
            <span>
              <strong className="block">{creator.display_name}</strong>
              <span className="text-sm text-white/50">@{creator.username}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="badge">{live ? `${compact(viewers)} watching` : stream.status}</span>
            {viewer && viewer.id !== creator.id ? <FollowButton creatorId={creator.id} following={following} /> : null}
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const url = window.location.href;
                if (navigator.share) await navigator.share({ title: stream.title, url });
                else await navigator.clipboard.writeText(url);
              }}
            >
              Share
            </button>
          </div>
        </div>
        <p className="text-sm text-white/70">{stream.description}</p>
        <div className="flex flex-wrap gap-2">
          {stream.tags.map((tag) => (
            <Link key={tag} className="chip" href={`/search?q=${encodeURIComponent("#" + tag)}`}>
              #{tag}
            </Link>
          ))}
        </div>
        {live ? (
          <div className="flex gap-2">
            {["🔥", "👏", "💜", "😂"].map((emoji) => (
              <button
                key={emoji}
                className="btn"
                type="button"
                onClick={async () => {
                  const result = await sendReactionAction(stream.id, emoji);
                  if (result.ok) setFloats((current) => [...current, { id: result.data.id, emoji }]);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {gifts.map((gift) => (
            <button
              key={gift.id}
              className="card px-3 py-3 text-left"
              type="button"
              disabled={!live || !viewer || coins < gift.coin_cost}
              onClick={async () => {
                const result = await sendGiftAction(stream.id, gift.id);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setError("");
                setCoins(result.data.balance);
                setBurst(result.data.event);
                setTimeout(() => setBurst(null), 2200);
              }}
            >
              <span className="text-xl">{gift.icon}</span>
              <span className="block text-sm font-semibold">{gift.name}</span>
              <span className="text-xs text-white/50">{gift.coin_cost} coins</span>
            </button>
          ))}
        </div>
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        <p className="text-xs text-white/40">{viewer ? `${coins} coins` : "Sign in to chat, follow, and send gifts."}</p>
      </div>
      <div className="card grid gap-3 p-3">
        <div className="chat">
          {messages.map((message) => (
            <article key={message.id} className="grid grid-cols-[auto_1fr] gap-2 text-sm">
              <Avatar user={message.sender} size={32} />
              <div>
                <p>
                  <Link href={`/u/${message.sender.username}`} className="font-semibold">
                    {message.sender.display_name}
                  </Link>{" "}
                  <span className="text-white/40">
                    <Stamp iso={message.created_at} />
                  </span>
                </p>
                <p className={message.removed ? "italic text-white/40" : ""}>{message.message}</p>
                {viewer && viewer.id !== message.sender.id ? (
                  <button className="text-xs text-white/40" type="button" onClick={() => setMessageId(message.id)}>
                    Report message
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {messages.length === 0 ? <p className="text-sm text-white/50">No messages yet.</p> : null}
        </div>
        {live && viewer ? (
          <form
            className="flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const message = text.trim();
              if (!message) return;
              setText("");
              const result = await sendChatAction(stream.id, message);
              if (!result.ok) setError(result.error);
              else setMessages((current) => [...current, result.data]);
            }}
          >
            <input className="field" value={text} onChange={(event) => setText(event.target.value)} maxLength={280} placeholder="Say something" aria-label="Message" />
            <button className="btn btn-primary" type="submit">
              Send
            </button>
          </form>
        ) : (
          <Link className="btn" href={`/login?next=/stream/${stream.id}`}>
            Sign in to chat
          </Link>
        )}
        {viewer ? (
          <form action={reportForm} className="grid gap-2 border-t border-white/10 pt-3">
            <input type="hidden" name="reported_stream" value={stream.id} />
            <input type="hidden" name="reported_user" value={creator.id} />
            <label className="label">
              Report
              <select className="field mt-1" name="reason" defaultValue="Spam">
                <option>Spam</option>
                <option>Harassment</option>
                <option>Violence</option>
                <option>Copyright</option>
              </select>
            </label>
            <input type="hidden" name="reported_message" value={messageId} />
            <p className="text-xs text-white/50">
              {messageId ? "A chat message is attached to this report." : "This reports the stream. Use Report message in chat to attach one."}
            </p>
            <button className="btn" disabled={reportPending} type="submit">
              Submit report
            </button>
            {reportState && reportState.ok === false ? <p className="text-sm text-rose-200">{reportState.error}</p> : null}
            {reportState && reportState.ok === true ? <p className="text-sm text-emerald-200">{reportState.message}</p> : null}
          </form>
        ) : null}
      </div>
      {burst ? (
        <div className="gift-burst" role="status">
          <img src={burst.animation_url} alt="" />
          <strong>
            {burst.icon} {burst.sender_name} sent {burst.gift_name}
          </strong>
        </div>
      ) : null}
    </div>
  );
}
