import { SettingsForm } from "@/components/settings-form";
import { PageHeader } from "@/components/ui";
import { signOutAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/current";
import { integrationStatus } from "@/lib/integrations/status";
import Link from "next/link";

const LABELS: Array<[keyof ReturnType<typeof integrationStatus>, string]> = [
  ["dataSource", "Data"],
  ["supabase", "Supabase"],
  ["livekit", "LiveKit"],
  ["stripe", "Stripe"],
  ["onesignal", "OneSignal"],
  ["cloudflare", "Cloudflare"],
  ["google", "Google"],
  ["apple", "Apple"],
  ["microsoft", "Microsoft"],
];

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div>
        <PageHeader title="Settings" />
        <Link className="btn btn-primary" href="/login?next=/settings">
          Sign in
        </Link>
      </div>
    );
  }
  const status = integrationStatus();
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader kicker={user.role} title="Settings" subtitle={`${user.email} · content filter ${user.content_filter_enabled ? "on" : "off"}`} />
      <SettingsForm user={user} />
      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Integrations</h2>
        <ul className="grid gap-1 text-sm">
          {LABELS.map(([key, label]) => (
            <li key={key} className="flex justify-between gap-3">
              <span>{label}</span>
              <span className="text-white/50">{String(status[key]) === "true" ? "configured" : String(status[key]) === "false" ? "demo" : String(status[key])}</span>
            </li>
          ))}
        </ul>
      </section>
      <form action={signOutAction}>
        <button className="btn" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
