import { finishOAuth } from "@/lib/actions";
import { consumeOAuthState, exchangeCode, isProvider } from "@/lib/integrations/oauth";
import { appOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";

async function finish(request: Request, provider: string, code: string, state: string, appleUser?: string | null) {
  const url = new URL(request.url);
  if (!isProvider(provider)) return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  const pending = consumeOAuthState(state, provider);
  if (!pending) return NextResponse.redirect(new URL("/login?error=oauth_state", url.origin));
  try {
    const origin = await appOrigin();
    const profile = await exchangeCode(provider, origin, code, appleUser);
    const result = await finishOAuth(profile, pending.next);
    if (!result.ok) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error)}`, url.origin));
    return NextResponse.redirect(new URL(result.next, url.origin));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth failed";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, url.origin));
  }
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  return finish(request, provider, url.searchParams.get("code") ?? "", url.searchParams.get("state") ?? "");
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const form = await request.formData();
  return finish(
    request,
    provider,
    String(form.get("code") ?? ""),
    String(form.get("state") ?? ""),
    form.get("user") ? String(form.get("user")) : null,
  );
}
