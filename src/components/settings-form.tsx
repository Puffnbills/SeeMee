"use client";

import { settingsAction, type ActionState } from "@/lib/actions";
import { AVATARS } from "@/lib/constants";
import { Avatar } from "@/components/ui";
import type { User } from "@/lib/types";
import { useActionState } from "react";

export function SettingsForm({ user }: { user: User }) {
  const [state, action, pending] = useActionState(settingsAction, null as ActionState);
  return (
    <form action={action} className="grid gap-4">
      <label>
        <span className="label">Display name</span>
        <input className="field" name="display_name" defaultValue={user.display_name} required minLength={2} maxLength={40} />
      </label>
      <label>
        <span className="label">Bio</span>
        <textarea className="field" name="bio" defaultValue={user.bio} maxLength={280} />
      </label>
      <fieldset>
        <legend className="label">Avatar</legend>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((avatar) => (
            <label key={avatar} className="grid justify-items-center gap-1 text-xs text-white/50">
              <input type="radio" name="avatar" value={avatar} defaultChecked={user.avatar === avatar} />
              <Avatar user={{ avatar, display_name: user.display_name }} />
            </label>
          ))}
        </div>
      </fieldset>
      <label className="check">
        <input name="content_filter_enabled" type="checkbox" defaultChecked={user.content_filter_enabled} />
        <span>Content filter. Hide Mature (18+ sexual) and Restricted streams, including nudity, from discovery and direct playback.</span>
      </label>
      {state && state.ok === false ? <p className="text-sm text-rose-200">{state.error}</p> : null}
      {state && state.ok === true ? <p className="text-sm text-emerald-200">{state.message}</p> : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        Save settings
      </button>
    </form>
  );
}
