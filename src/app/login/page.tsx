import { AuthForm } from "@/components/auth-form";
import { PageHeader } from "@/components/ui";
import { read } from "@/lib/db";
import { safeNext } from "@/lib/format";
import { integrationStatus } from "@/lib/integrations/status";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : "/home");
  const error = typeof params.error === "string" ? params.error : undefined;
  const accounts = await read((db) =>
    ["alex@seemee.demo", "sam@seemee.demo", "morgan@seemee.demo", "riley@seemee.demo"].map((email) => {
      const user = db.users.find((item) => item.email === email)!;
      return { email, display_name: user.display_name, role: user.role };
    }),
  );
  const oauth = integrationStatus();
  return (
    <main className="mx-auto grid min-h-screen max-w-lg gap-6 px-5 py-10">
      <Link href="/" className="display text-2xl">
        SeeMee
      </Link>
      <PageHeader kicker="Enter" title="Sign in" subtitle="Use a demo account, any password, or a configured OAuth provider." />
      <AuthForm
        mode="login"
        next={next}
        accounts={accounts}
        oauth={{ google: oauth.google, apple: oauth.apple, microsoft: oauth.microsoft }}
        error={error}
      />
      <p className="text-sm text-white/60">
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </main>
  );
}
