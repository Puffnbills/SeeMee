"use client";

import { useEffect, useRef, useState } from "react";

export function LiveStage({
  room,
  publish,
  title,
  status,
}: {
  room: string;
  publish: boolean;
  title: string;
  status: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [note, setNote] = useState(status === "Live" ? "Connecting…" : status);
  useEffect(() => {
    if (status !== "Live") return;
    let cancelled = false;
    let roomRef: { disconnect: () => void } | null = null;
    (async () => {
      const response = await fetch(`/api/livekit/token?room=${encodeURIComponent(room)}&publish=${publish ? "1" : "0"}`);
      const data = (await response.json()) as { mode?: string; token?: string; url?: string; error?: string };
      if (cancelled) return;
      if (data.mode !== "livekit" || !data.token || !data.url) {
        setNote(publish ? "Preview stage. Add LiveKit keys to publish a real room." : "Live stage. Add LiveKit keys to play the room.");
        return;
      }
      try {
        const { Room, RoomEvent, createLocalTracks } = await import("livekit-client");
        const liveRoom = new Room();
        roomRef = liveRoom;
        const attach = (track: { kind?: string; attach?: (el: HTMLVideoElement) => void }) => {
          if (track.kind === "video" && track.attach && videoRef.current) track.attach(videoRef.current);
        };
        liveRoom.on(RoomEvent.TrackSubscribed, attach);
        await liveRoom.connect(data.url, data.token);
        if (publish) {
          const tracks = await createLocalTracks({ audio: true, video: true });
          for (const track of tracks) {
            await liveRoom.localParticipant.publishTrack(track);
            attach(track);
          }
        }
        if (!cancelled) setNote("");
      } catch {
        if (!cancelled) setNote("Camera or room connection failed. The styled stage stays up.");
      }
    })();
    return () => {
      cancelled = true;
      roomRef?.disconnect();
    };
  }, [publish, room, status]);
  return (
    <div className="stage">
      <video ref={videoRef} autoPlay playsInline muted={publish} />
      <div className="stage-copy">
        <div className="eq" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <p className="mt-2 font-semibold">{title}</p>
        {note ? <p className="text-sm text-white/70">{note}</p> : null}
      </div>
    </div>
  );
}
