-- SeeMee schema, row level security, and reference data.
-- Apply in the Supabase SQL editor or with `supabase db push`.
-- The Next.js app uses an in-memory demo store unless SEEMEE_DATA_SOURCE=supabase.
-- With Supabase enabled, the server uses the service role. These policies protect
-- direct access with the anon and authenticated keys.

create table if not exists public.users (
  id text primary key,
  username text not null unique,
  display_name text not null,
  email text not null unique,
  avatar text not null default 'rose',
  bio text not null default '',
  verified boolean not null default false,
  coin_balance integer not null default 0 check (coin_balance >= 0),
  followers_count integer not null default 0 check (followers_count >= 0),
  following_count integer not null default 0 check (following_count >= 0),
  total_streams integer not null default 0 check (total_streams >= 0),
  total_views integer not null default 0 check (total_views >= 0),
  total_revenue double precision not null default 0,
  stripe_customer_id text,
  content_filter_enabled boolean not null default true,
  role text not null default 'viewer' check (role in ('viewer', 'creator', 'moderator', 'administrator')),
  created_date timestamptz not null default now(),
  banned boolean not null default false,
  warning_count integer not null default 0 check (warning_count >= 0)
);

create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  icon text not null,
  active_streams integer not null default 0 check (active_streams >= 0)
);

create table if not exists public.content_ratings (
  id text primary key,
  name text not null unique,
  minimum_age integer not null check (minimum_age >= 0),
  description text not null
);

create table if not exists public.gifts (
  id text primary key,
  name text not null unique,
  icon text not null,
  coin_cost integer not null check (coin_cost > 0),
  animation_url text not null
);

create table if not exists public.streams (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null references public.categories (name),
  creator text not null references public.users (id),
  status text not null check (status in ('Live', 'Ended', 'Archived')),
  stream_room_id text not null unique,
  thumbnail text not null default '',
  viewer_count integer not null default 0 check (viewer_count >= 0),
  peak_viewers integer not null default 0 check (peak_viewers >= 0),
  total_watch_time integer not null default 0 check (total_watch_time >= 0),
  replay_url text,
  content_rating text not null references public.content_ratings (name),
  sensitive_content_warning boolean not null default false,
  includes_nudity boolean not null default false,
  sexual_content boolean not null default false,
  language text not null default 'en',
  location text not null default 'Remote',
  latitude double precision,
  longitude double precision,
  tags text[] not null default '{}',
  moderation_status text not null default 'active' check (moderation_status in ('active', 'suspended')),
  ingest_url text,
  cloudflare_input_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.chat_messages (
  id text primary key,
  stream text not null references public.streams (id) on delete cascade,
  sender text not null references public.users (id),
  message text not null,
  created_at timestamptz not null default now(),
  removed boolean not null default false
);

create table if not exists public.follows (
  id text primary key,
  follower text not null references public.users (id) on delete cascade,
  creator text not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower, creator),
  check (follower <> creator)
);

create table if not exists public.gift_transactions (
  id text primary key,
  sender text not null references public.users (id),
  receiver text not null references public.users (id),
  stream text not null references public.streams (id),
  gift text not null references public.gifts (id),
  coins_spent integer not null check (coins_spent > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id text primary key,
  "user" text not null references public.users (id),
  transaction_type text not null check (transaction_type in ('Purchase', 'Gift Sent', 'Gift Received', 'Refund')),
  coins integer not null,
  amount double precision,
  external_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  recipient text not null references public.users (id) on delete cascade,
  type text not null check (type in ('New Follower', 'Live Alert', 'Gift Received', 'Moderator Action', 'Announcement')),
  title text not null,
  body text not null,
  read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id text primary key,
  reporter text not null references public.users (id),
  reported_user text references public.users (id),
  reported_stream text references public.streams (id),
  reported_message text references public.chat_messages (id),
  reason text not null check (reason in ('Spam', 'Harassment', 'Violence', 'Copyright')),
  status text not null default 'Open' check (status in ('Open', 'Under Review', 'Resolved', 'Rejected')),
  created_at timestamptz not null default now()
);

create index if not exists streams_status_idx on public.streams (status, moderation_status);
create index if not exists streams_creator_idx on public.streams (creator);
create index if not exists chat_messages_stream_idx on public.chat_messages (stream, created_at);
create index if not exists follows_pair_idx on public.follows (follower, creator);
create index if not exists notifications_recipient_idx on public.notifications (recipient, read);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists wallet_user_idx on public.wallet_transactions ("user", created_at);
create index if not exists gift_tx_stream_idx on public.gift_transactions (stream, created_at);

insert into public.categories (id, name, icon) values
  ('cat_music', 'Music', '🎵'),
  ('cat_gaming', 'Gaming', '🎮'),
  ('cat_chat', 'Just Chatting', '💬'),
  ('cat_art', 'Art', '🎨'),
  ('cat_fitness', 'Fitness', '💪'),
  ('cat_irl', 'IRL', '📍'),
  ('cat_comedy', 'Comedy', '🎭'),
  ('cat_education', 'Education', '📚'),
  ('cat_nightlife', 'Nightlife', '🌙')
on conflict (id) do nothing;

insert into public.content_ratings (id, name, minimum_age, description) values
  ('rating_g', 'General Audience (G)', 0, 'Suitable for all ages.'),
  ('rating_teen', 'Teen (13+)', 13, 'Mild language or suggestive themes. No sexual content.'),
  ('rating_mature', 'Mature (18+)', 18, 'Sexual content for adults 18 and older.'),
  ('rating_restricted', 'Restricted Content', 18, 'Explicit sexual content and nudity. Adults 18 and older only.')
on conflict (id) do nothing;

insert into public.gifts (id, name, icon, coin_cost, animation_url) values
  ('gift_like', 'Like', '❤️', 10, '/gifts/like.svg'),
  ('gift_fire', 'Fire', '🔥', 50, '/gifts/fire.svg'),
  ('gift_star', 'Star', '⭐', 100, '/gifts/star.svg'),
  ('gift_rocket', 'Rocket', '🚀', 500, '/gifts/rocket.svg'),
  ('gift_crown', 'Crown', '👑', 1000, '/gifts/crown.svg')
on conflict (id) do nothing;

create or replace function public.is_staff(uid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = uid and role in ('moderator', 'administrator') and banned = false
  );
$$;

create or replace function public.protect_user_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or public.is_staff(auth.uid()::text) then
    return new;
  end if;
  new.role := old.role;
  new.banned := old.banned;
  new.coin_balance := old.coin_balance;
  new.followers_count := old.followers_count;
  new.following_count := old.following_count;
  new.total_streams := old.total_streams;
  new.total_views := old.total_views;
  new.total_revenue := old.total_revenue;
  new.stripe_customer_id := old.stripe_customer_id;
  new.warning_count := old.warning_count;
  new.verified := old.verified;
  new.email := old.email;
  new.username := old.username;
  new.created_date := old.created_date;
  return new;
end;
$$;

drop trigger if exists protect_user_columns on public.users;
create trigger protect_user_columns
before update on public.users
for each row execute function public.protect_user_columns();

create or replace view public.public_profiles
with (security_invoker = false, security_barrier = true) as
select
  id,
  username,
  display_name,
  avatar,
  bio,
  verified,
  followers_count,
  following_count,
  total_streams,
  total_views,
  created_date
from public.users
where banned = false;

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.content_ratings enable row level security;
alter table public.gifts enable row level security;
alter table public.streams enable row level security;
alter table public.chat_messages enable row level security;
alter table public.follows enable row level security;
alter table public.gift_transactions enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

drop policy if exists users_select on public.users;
create policy users_select on public.users
for select using (id = auth.uid()::text or public.is_staff(auth.uid()::text));

drop policy if exists users_update on public.users;
create policy users_update on public.users
for update using (id = auth.uid()::text or public.is_staff(auth.uid()::text))
with check (id = auth.uid()::text or public.is_staff(auth.uid()::text));

drop policy if exists users_insert on public.users;
create policy users_insert on public.users
for insert with check (id = auth.uid()::text);

drop policy if exists catalog_read_categories on public.categories;
create policy catalog_read_categories on public.categories for select using (true);

drop policy if exists catalog_read_ratings on public.content_ratings;
create policy catalog_read_ratings on public.content_ratings for select using (true);

drop policy if exists catalog_read_gifts on public.gifts;
create policy catalog_read_gifts on public.gifts for select using (true);

drop policy if exists streams_select on public.streams;
create policy streams_select on public.streams
for select using (
  moderation_status = 'active'
  or creator = auth.uid()::text
  or public.is_staff(auth.uid()::text)
);

drop policy if exists streams_insert on public.streams;
create policy streams_insert on public.streams
for insert with check (
  creator = auth.uid()::text
  and exists (
    select 1 from public.users
    where id = auth.uid()::text
      and banned = false
      and role in ('creator', 'administrator')
  )
);

drop policy if exists streams_update on public.streams;
create policy streams_update on public.streams
for update using (creator = auth.uid()::text or public.is_staff(auth.uid()::text))
with check (creator = auth.uid()::text or public.is_staff(auth.uid()::text));

drop policy if exists messages_select on public.chat_messages;
create policy messages_select on public.chat_messages
for select using (
  removed = false
  or sender = auth.uid()::text
  or public.is_staff(auth.uid()::text)
);

drop policy if exists messages_insert on public.chat_messages;
create policy messages_insert on public.chat_messages
for insert with check (
  sender = auth.uid()::text
  and exists (select 1 from public.users where id = auth.uid()::text and banned = false)
);

drop policy if exists messages_update on public.chat_messages;
create policy messages_update on public.chat_messages
for update using (public.is_staff(auth.uid()::text))
with check (public.is_staff(auth.uid()::text));

drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select using (true);

drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows
for insert with check (follower = auth.uid()::text and follower <> creator);

drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows
for delete using (follower = auth.uid()::text);

drop policy if exists gifts_tx_select on public.gift_transactions;
create policy gifts_tx_select on public.gift_transactions
for select using (
  sender = auth.uid()::text
  or receiver = auth.uid()::text
  or public.is_staff(auth.uid()::text)
);

drop policy if exists gifts_tx_insert on public.gift_transactions;
create policy gifts_tx_insert on public.gift_transactions
for insert with check (sender = auth.uid()::text);

drop policy if exists wallet_select on public.wallet_transactions;
create policy wallet_select on public.wallet_transactions
for select using ("user" = auth.uid()::text or public.is_staff(auth.uid()::text));

drop policy if exists wallet_insert on public.wallet_transactions;
create policy wallet_insert on public.wallet_transactions
for insert with check ("user" = auth.uid()::text);

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select using (recipient = auth.uid()::text or public.is_staff(auth.uid()::text));

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
for update using (recipient = auth.uid()::text)
with check (recipient = auth.uid()::text);

drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
for select using (reporter = auth.uid()::text or public.is_staff(auth.uid()::text));

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
for insert with check (reporter = auth.uid()::text and status = 'Open');

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
for update using (public.is_staff(auth.uid()::text))
with check (public.is_staff(auth.uid()::text));

grant usage on schema public to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
grant select on public.categories, public.content_ratings, public.gifts, public.streams, public.follows to anon, authenticated;
grant select, insert, update, delete on public.users, public.streams, public.chat_messages, public.follows,
  public.gift_transactions, public.wallet_transactions, public.notifications, public.reports to authenticated;
grant execute on function public.is_staff(text) to anon, authenticated;
