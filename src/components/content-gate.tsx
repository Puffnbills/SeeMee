import { acknowledgeGateAction } from "@/lib/actions";
import { gateKind } from "@/lib/logic";
import type { Stream } from "@/lib/types";

export function ContentGate({ stream, needsAge }: { stream: Stream; needsAge?: boolean }) {
  const adult = gateKind(stream) === "adult";
  const notes = [
    stream.sexual_content || stream.content_rating.startsWith("Mature") || stream.content_rating.startsWith("Restricted")
      ? "sexual content"
      : null,
    stream.includes_nudity || stream.content_rating.startsWith("Restricted") ? "nudity" : null,
  ].filter(Boolean);
  return (
    <form action={acknowledgeGateAction} className="gate grid gap-3">
      <p className="kicker">{adult ? "Adults only" : "Sensitive content"}</p>
      <h2 className="display text-2xl">{stream.title}</h2>
      <p className="text-sm text-white/75">
        Rated {stream.content_rating}.
        {notes.length ? ` This livestream includes ${notes.join(" and ")}.` : " The creator added a sensitive-content warning."}{" "}
        The thumbnail stays unblurred. Playback waits until you continue.
      </p>
      {adult ? (
        <label className="check">
          <input name="adult" type="checkbox" required />
          <span>I confirm I am 18 or older.</span>
        </label>
      ) : null}
      {needsAge ? <p className="text-sm text-rose-200">Confirm your age to enter.</p> : null}
      <input type="hidden" name="stream" value={stream.id} />
      <div className="flex gap-2">
        <button className="btn btn-primary" type="submit">
          {adult ? "Enter stream" : "Continue"}
        </button>
        <a className="btn" href="/home">
          Go back
        </a>
      </div>
    </form>
  );
}
