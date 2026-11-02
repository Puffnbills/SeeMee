export async function createCloudflareLiveInput(name: string) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) return null;
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/live_inputs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ meta: { name }, recording: { mode: "automatic" } }),
    });
    const json = (await res.json()) as {
      success?: boolean;
      result?: { uid?: string; rtmps?: { url?: string; streamKey?: string } };
    };
    if (!res.ok || !json.success || !json.result?.uid) return null;
    const rtmps = json.result.rtmps;
    const ingestUrl = rtmps?.url && rtmps.streamKey ? `${rtmps.url}${rtmps.streamKey}` : rtmps?.url ?? "";
    const customer = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;
    const playbackUrl =
      customer && json.result.uid
        ? `https://customer-${customer}.cloudflarestream.com/${json.result.uid}/manifest/video.m3u8`
        : null;
    return { uid: json.result.uid, ingestUrl, playbackUrl };
  } catch {
    return null;
  }
}
