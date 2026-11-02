import { AccessToken } from "livekit-server-sdk";

export async function createLiveKitToken(opts: {
  room: string;
  identity: string;
  name: string;
  publish: boolean;
}) {
  const url = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return null;
  const token = new AccessToken(key, secret, { identity: opts.identity, name: opts.name, ttl: "6h" });
  token.addGrant({
    roomJoin: true,
    room: opts.room,
    canPublish: opts.publish,
    canSubscribe: true,
  });
  return { token: await token.toJwt(), url };
}
