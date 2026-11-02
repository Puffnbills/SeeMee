export async function pushNotify(userIds: string[], title: string, body: string) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const key = process.env.ONESIGNAL_REST_API_KEY;
  const targets = userIds.filter(Boolean);
  if (!appId || !key || targets.length === 0) return { mode: "skipped" as const };
  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        app_id: appId,
        target_channel: "push",
        include_aliases: { external_id: targets },
        headings: { en: title },
        contents: { en: body },
      }),
    });
    return { mode: res.ok ? ("sent" as const) : ("error" as const) };
  } catch {
    return { mode: "error" as const };
  }
}
