"use client";

import { startStreamAction, updateStreamAction, type ActionState } from "@/lib/actions";
import { isAdultRating } from "@/lib/constants";
import type { Stream } from "@/lib/types";
import { useActionState, useState } from "react";

export function GoLiveForm({
  categories,
  ratings,
  languages,
  places,
  stream,
}: {
  categories: Array<{ name: string; icon: string }>;
  ratings: Array<{ name: string; description: string }>;
  languages: Array<{ code: string; label: string }>;
  places: string[];
  stream?: Stream;
}) {
  const action = stream ? updateStreamAction : startStreamAction;
  const [state, formAction, pending] = useActionState(action, null as ActionState);
  const [rating, setRating] = useState(stream?.content_rating ?? ratings[0]?.name ?? "");
  const [sexual, setSexual] = useState(stream?.sexual_content ?? false);
  const [nudity, setNudity] = useState(stream?.includes_nudity ?? false);
  const adult = isAdultRating(rating) || sexual || nudity;
  return (
    <form action={formAction} className="grid gap-4">
      {stream ? <input type="hidden" name="stream" value={stream.id} /> : null}
      <label>
        <span className="label">Title</span>
        <input className="field" name="title" required minLength={3} maxLength={80} defaultValue={stream?.title ?? ""} />
      </label>
      <label>
        <span className="label">Description</span>
        <textarea className="field" name="description" maxLength={500} defaultValue={stream?.description ?? ""} placeholder="Optional. Hashtags become searchable." />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label">Category</span>
          <select className="field" name="category" defaultValue={stream?.category ?? categories[0]?.name}>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Language</span>
          <select className="field" name="language" defaultValue={stream?.language ?? "en"}>
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className="label">Location</span>
        <input className="field" name="location" list="places" defaultValue={stream?.location ?? "Remote"} />
        <datalist id="places">
          {places.map((place) => (
            <option key={place} value={place} />
          ))}
          <option value="Remote" />
        </datalist>
      </label>
      <label>
        <span className="label">Content rating</span>
        <select className="field" name="content_rating" value={rating} onChange={(event) => setRating(event.target.value)}>
          {ratings.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-white/50">{ratings.find((item) => item.name === rating)?.description}</p>
      </label>
      <label className="check">
        <input name="sensitive_content_warning" type="checkbox" defaultChecked={stream?.sensitive_content_warning ?? adult} />
        <span>Sensitive content warning. Viewers see a gate before playback. Thumbnails stay sharp.</span>
      </label>
      <label className="check">
        <input name="sexual_content" type="checkbox" checked={sexual || rating.startsWith("Mature") || rating.startsWith("Restricted")} onChange={(event) => setSexual(event.target.checked)} />
        <span>Sexual content. Mature means 18+ sexual. This cannot be paired with a G or Teen rating.</span>
      </label>
      <label className="check">
        <input name="includes_nudity" type="checkbox" checked={nudity || rating.startsWith("Restricted")} onChange={(event) => setNudity(event.target.checked)} />
        <span>Nudity. Restricted streams always include explicit sexual content and nudity.</span>
      </label>
      {state && state.ok === false ? <p className="text-sm text-rose-200">{state.error}</p> : null}
      {state && state.ok === true ? <p className="text-sm text-emerald-200">{state.message}</p> : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {stream ? "Save stream settings" : "Start livestream"}
      </button>
    </form>
  );
}
