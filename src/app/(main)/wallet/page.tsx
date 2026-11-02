import { PageHeader, Stamp } from "@/components/ui";
import { purchaseAction, applyCheckoutSession } from "@/lib/actions";
import { COIN_PACKAGES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { money } from "@/lib/format";
import { integrationStatus } from "@/lib/integrations/status";
import Link from "next/link";

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div>
        <PageHeader title="Wallet" subtitle="Sign in to buy coins and see the ledger." />
        <Link className="btn btn-primary" href="/login?next=/wallet">
          Sign in
        </Link>
      </div>
    );
  }
  if (typeof params.session_id === "string") await applyCheckoutSession(params.session_id);
  const fresh = (await getCurrentUser()) ?? user;
  const rows = await read((db) =>
    db.walletTransactions
      .filter((row) => row.user === fresh.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );
  const stripe = integrationStatus().stripe;
  return (
    <div>
      <PageHeader kicker="Coins" title={`${fresh.coin_balance} coins`} subtitle="One coin is $0.01 of creator revenue when it is gifted. Purchases are not bank payouts." />
      {params.purchased ? <p className="mb-3 text-sm text-emerald-200">Coins added.</p> : null}
      {params.canceled ? <p className="mb-3 text-sm text-white/60">Checkout canceled.</p> : null}
      {params.error ? <p className="mb-3 text-sm text-rose-200">Purchase could not be completed.</p> : null}
      <p className="mb-4 text-sm text-white/60">
        {stripe ? "Stripe is configured. Purchases open Checkout." : "Stripe is not configured. Purchases credit coins instantly in this demo."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {COIN_PACKAGES.map((pack) => (
          <form key={pack.id} action={purchaseAction} className="card grid gap-2 p-4">
            <input type="hidden" name="package" value={pack.id} />
            <h2 className="display text-2xl">{pack.name}</h2>
            <p>
              {pack.coins} coins · {money(pack.amount)}
            </p>
            <button className="btn btn-primary" type="submit">
              Buy
            </button>
          </form>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Ledger</h2>
      <div className="grid gap-2">
        {rows.map((row) => (
          <article key={row.id} className="card flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-semibold">{row.transaction_type}</p>
              <p className="text-white/50">
                <Stamp iso={row.created_at} />
              </p>
            </div>
            <div className="text-right">
              <p>{row.coins > 0 ? `+${row.coins}` : row.coins}</p>
              <p className="text-white/50">{row.amount == null ? "" : money(row.amount)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
