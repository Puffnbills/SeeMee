import { integrationStatus } from "@/lib/integrations/status";
import { authorizationUrl, isProvider, issueOAuthState } from "@/lib/integrations/oauth";
import { appOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isProvider(provider)) return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  const status = integrationStatus();
  const configured =
    provider === "google" ? status.google : provider === "apple" ? status.apple : status.microsoft;
  const url = new URL(request.url);
  if (!configured) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", url.origin));
  }
  const state = issueOAuthState(provider, url.searchParams.get("next") ?? "/home");
  const origin = await appOrigin();
  return NextResponse.redirect(authorizationUrl(provider, origin, state));
}
