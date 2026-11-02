import "server-only";
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import { safeNext } from "../format";

export type OAuthProvider = "google" | "apple" | "microsoft";

const pending = new Map<string, { exp: number; next: string; provider: OAuthProvider }>();
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export function isProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "apple" || value === "microsoft";
}

export function issueOAuthState(provider: OAuthProvider, next: string) {
  const state = crypto.randomUUID();
  pending.set(state, { exp: Date.now() + 10 * 60 * 1000, next: safeNext(next), provider });
  return state;
}

export function consumeOAuthState(state: string, provider: OAuthProvider) {
  const row = pending.get(state);
  pending.delete(state);
  if (!row || row.exp < Date.now() || row.provider !== provider) return null;
  return row;
}

function applePrivateKey() {
  return (process.env.APPLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
}

async function appleClientSecret() {
  const key = await importPKCS8(applePrivateKey(), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID })
    .setIssuer(process.env.APPLE_TEAM_ID!)
    .setIssuedAt()
    .setExpirationTime("5m")
    .setAudience("https://appleid.apple.com")
    .setSubject(process.env.APPLE_CLIENT_ID!)
    .sign(key);
}

export function authorizationUrl(provider: OAuthProvider, origin: string, state: string) {
  const redirectUri = `${origin}/api/auth/callback/${provider}`;
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }
  if (provider === "microsoft") {
    const tenant = process.env.MICROSOFT_TENANT_ID || "common";
    const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
    url.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", "openid email profile User.Read");
    url.searchParams.set("state", state);
    return url.toString();
  }
  const url = new URL("https://appleid.apple.com/auth/authorize");
  url.searchParams.set("client_id", process.env.APPLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("scope", "name email");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(provider: OAuthProvider, origin: string, code: string, appleUser?: string | null) {
  const redirectUri = `${origin}/api/auth/callback/${provider}`;
  if (provider === "google") {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) throw new Error("Google did not return an access token.");
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = (await profileRes.json()) as { email?: string; name?: string; picture?: string };
    return { email: profile.email ?? "", name: profile.name ?? "", avatar: profile.picture ?? null };
  }
  if (provider === "microsoft") {
    const tenant = process.env.MICROSOFT_TENANT_ID || "common";
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "openid email profile User.Read",
      }),
    });
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) throw new Error("Microsoft did not return an access token.");
    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = (await profileRes.json()) as { mail?: string; userPrincipalName?: string; displayName?: string };
    return {
      email: profile.mail || profile.userPrincipalName || "",
      name: profile.displayName ?? "",
      avatar: null,
    };
  }
  const secret = await appleClientSecret();
  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID!,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const token = (await tokenRes.json()) as { id_token?: string };
  if (!token.id_token) throw new Error("Apple did not return an id token.");
  const { payload } = await jwtVerify(token.id_token, appleKeys, {
    issuer: "https://appleid.apple.com",
    audience: process.env.APPLE_CLIENT_ID,
  });
  let name = "";
  if (appleUser) {
    try {
      const parsed = JSON.parse(appleUser) as { name?: { firstName?: string; lastName?: string } };
      name = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ");
    } catch {
      name = "";
    }
  }
  return { email: String(payload.email ?? ""), name, avatar: null };
}
