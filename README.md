# SeeMee

Mobile-first public livestreams. Dark theme, vertical discovery, floating Go Live button.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables are required.

```bash
npm run check
npm run build
```

## Demo sign-in

Any password works. Passwords are not stored.

| Email | Person | Role |
| --- | --- | --- |
| alex@seemee.demo | Alex Rivera | Creator, content filter on |
| sam@seemee.demo | Sam Okonkwo | Viewer, filter off (can open 18+ rooms) |
| morgan@seemee.demo | Morgan Hale | Moderator |
| riley@seemee.demo | Riley Chen | Administrator |

Google, Apple, and Microsoft buttons sign into Alex, Sam, and Morgan when those providers are not configured.

Alex's filter hides Mature and Restricted streams. Sam can open After Dark and Closed Curtain, confirm 18+, and enter. Thumbnails stay sharp.

## Real vs stubbed

Always running in the app:

- Feed, search, profiles, chat, follows, gifts, wallet ledger, reports, moderation, admin, analytics
- Content ratings, sensitive gate, 18+ sexual / nudity flow, content filter
- Roles: viewer, creator, moderator, administrator

Real when the matching env vars are set, otherwise the demo path:

| Integration | Configured | Without keys |
| --- | --- | --- |
| Data | `SEEMEE_DATA_SOURCE=supabase` plus Supabase URL and service role | In-memory seeded store |
| LiveKit | URL, API key, secret | Styled preview stage |
| Stripe | Secret key. Webhook secret for `POST /api/stripe/webhook` | Instant coin credit |
| OneSignal | App id and REST key | In-app notifications only |
| Cloudflare Stream | Account id and API token | No ingest URL |
| Google / Apple / Microsoft | Provider client credentials | Demo account buttons |

Revenue is an in-app ledger at $0.01 per gifted coin. Stripe charges for coin packs. Stripe Connect payouts are not implemented.

Supabase mode does not load the demo social graph. The migration seeds categories, ratings, and gifts. The service role bypasses RLS; the policies protect direct anon and authenticated access.

## Routes

- `/` landing
- `/login` `/signup`
- `/home` and `/home?tab=location|map|trending|newest|following|category`
- `/stream/[id]`
- `/u/[username]`
- `/go-live`
- `/studio/[id]`
- `/wallet`
- `/notifications`
- `/search`
- `/settings`
- `/admin`
- `/moderation`
- `GET /api/health`
- `GET /api/livekit/token`
- `GET /api/streams/[id]/state`
- `POST /api/streams/[id]/join`
- `POST /api/streams/[id]/heartbeat`
- `POST /api/stripe/webhook`
- `GET /api/auth/[provider]`
- `GET|POST /api/auth/callback/[provider]`

## SQL

`supabase/migrations/20261102120000_initial_schema.sql`

Tables: users, streams, chat messages, follows, gifts, gift transactions, wallet transactions, notifications, reports, categories, content ratings. Row Level Security is enabled. Mature (18+) is sexual content. Restricted is explicit sexual content and nudity.
