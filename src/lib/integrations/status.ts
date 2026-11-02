export function integrationStatus() {
  return {
    dataSource: process.env.SEEMEE_DATA_SOURCE === "supabase" ? "supabase" : "memory",
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    livekit: Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    onesignal: Boolean(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY),
    cloudflare: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: Boolean(
      process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        process.env.APPLE_PRIVATE_KEY,
    ),
    microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    oneSignalAppId: process.env.ONESIGNAL_APP_ID ?? "",
  };
}

export type IntegrationStatus = ReturnType<typeof integrationStatus>;
