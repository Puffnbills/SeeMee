import { OneSignalBoot } from "@/components/onesignal-boot";
import { Shell } from "@/components/shell";
import { getCurrentUser } from "@/lib/current";
import { read } from "@/lib/db";
import { integrationStatus } from "@/lib/integrations/status";
import { toPublicUser } from "@/lib/logic";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const unread = user
    ? await read((db) => db.notifications.filter((note) => note.recipient === user.id && !note.read).length)
    : 0;
  const status = integrationStatus();
  return (
    <>
      <Shell user={user ? toPublicUser(user) : null} unread={unread} balance={user?.coin_balance ?? null}>
        {children}
      </Shell>
      <OneSignalBoot appId={status.oneSignalAppId} userId={user?.id ?? ""} />
    </>
  );
}
