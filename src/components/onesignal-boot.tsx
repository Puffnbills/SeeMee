"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    OneSignalDeferred?: Array<
      (oneSignal: { init: (options: { appId: string }) => Promise<void>; login: (id: string) => Promise<void> }) => Promise<void>
    >;
  }
}

export function OneSignalBoot({ appId, userId }: { appId: string; userId: string }) {
  useEffect(() => {
    if (!appId) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({ appId });
      if (userId) await OneSignal.login(userId);
    });
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);
  }, [appId, userId]);
  return null;
}
