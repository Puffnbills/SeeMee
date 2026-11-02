import { AuthForm } from "@/components/auth-form";
import { PageHeader } from "@/components/ui";
import { safeNext } from "@/lib/format";
import { integrationStatus } from "@/lib/integrations/status";
import Link from "next/link";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : "/home");
  const oauth = integrationStatus();
  return (
    <main className="mx-auto grid min-h-screen max-w-lg gap-6 px-5 py-10">
      <Link href="/" className="display text-2xl">
        SeeMee
      </Link>
      <PageHeader kicker="Join" title="Create an account" subtitle="New accounts are viewers with the content filter on and 100 starter coins." />
      <AuthForm
        mode="signup"
        next={next}
        accounts={[]}
        oauth={{ google: oauth.google, apple: oauth.apple, microsoft: oauth.microsoft }}
      />
      <p className="text-sm text-white/60">
        Already have a demo login? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
