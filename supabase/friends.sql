-- Vier Säulen — Freunde
-- Im Supabase-Dashboard: SQL Editor → New query → alles einfügen → Run.
-- Läuft mehrfach durch, ohne Schaden anzurichten.
--
-- Grundsatz: Row Level Security entscheidet, wer was sieht. Sichtbar wird ein
-- fremdes Profil erst, wenn eine Freundschaft besteht oder angefragt wurde.
-- Es gibt bewusst keine Möglichkeit, die Nutzerliste zu durchsuchen — man
-- findet jemanden nur über den exakten Handle.

-- ============================================================
-- 1 · Tabellen
-- ============================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  -- Der Handle ist das, was man Freunden gibt. Klein, knapp, eindeutig.
  handle        text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name  text not null default '' check (char_length(display_name) <= 40),
  emoji         text not null default '' check (char_length(emoji) <= 8),
  accent        text not null default 'learn' check (accent in ('learn', 'body', 'image', 'money')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Nachgezogen: das eigene Zeichen und welche Darstellung gewaehlt ist.
-- add column if not exists laesst sich gefahrlos erneut ausfuehren.
alter table public.profiles
  add column if not exists avatar text not null default 'letter'
  check (avatar in ('letter', 'emoji', 'sigil'));

alter table public.profiles
  add column if not exists sigil jsonb;

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references auth.users (id) on delete cascade,
  addressee  uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendship_not_self check (requester <> addressee)
);

-- Eine Beziehung je Paar, unabhängig davon, wer zuerst gefragt hat.
create unique index if not exists friendships_pair
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- Was Freunde voneinander sehen: der Tagesscore, sonst nichts. Keine Routinen,
-- keine Notizen, keine Check-ins.
create table if not exists public.daily_shares (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  score      int  not null default 0 check (score between 0 and 100),
  streak     int  not null default 0 check (streak >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists daily_shares_day on public.daily_shares (day);

-- ============================================================
-- 2 · Hilfsfunktionen
--
-- security definer ist hier notwendig, nicht bequem: würden die Policies auf
-- profiles direkt friendships abfragen, müsste dafür wieder RLS greifen — und
-- die Policy auf friendships fragte erneut profiles ab. Diese Funktionen
-- brechen den Kreis, sind auf das Nötigste beschränkt und lesen ausschließlich
-- Zeilen, an denen die aufrufende Person selbst beteiligt ist.
-- ============================================================

create or replace function public.is_friend(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (   (f.requester = auth.uid() and f.addressee = other)
           or (f.addressee = auth.uid() and f.requester = other))
  );
$$;

-- Auch offene Anfragen zählen: sonst sähe man nicht, wer einen angefragt hat.
create or replace function public.is_linked(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where (   (f.requester = auth.uid() and f.addressee = other)
           or (f.addressee = auth.uid() and f.requester = other))
  );
$$;

-- Jemanden finden: nur über den exakten Handle, nie über eine Teilzeichenkette.
-- Damit lässt sich die Nutzerliste nicht abgrasen.
create or replace function public.find_by_handle(wanted text)
returns table (id uuid, handle text, display_name text, emoji text, accent text, avatar text, sigil jsonb)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.handle, p.display_name, p.emoji, p.accent, p.avatar, p.sigil
  from public.profiles p
  where p.handle = lower(trim(wanted))
    and p.id <> auth.uid()
  limit 1;
$$;

-- Supabase vergibt per Default-Privileg automatisch execute an anon und
-- authenticated. Ein revoke von public entfernt das NICHT — anon muss
-- ausdruecklich genannt werden, sonst laesst sich die Funktion ohne
-- Anmeldung aufrufen.
revoke all on function public.find_by_handle(text) from public, anon;
grant execute on function public.find_by_handle(text) to authenticated;
revoke all on function public.is_friend(uuid) from public, anon;
grant execute on function public.is_friend(uuid) to authenticated;
revoke all on function public.is_linked(uuid) from public, anon;
grant execute on function public.is_linked(uuid) to authenticated;

-- ============================================================
-- 3 · Row Level Security
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.friendships   enable row level security;
alter table public.daily_shares  enable row level security;

-- --- profiles -------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_linked(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (id = auth.uid());

-- --- friendships ----------------------------------------------
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (requester = auth.uid() or addressee = auth.uid());

-- Anfragen stellt man nur im eigenen Namen, und immer als 'pending'.
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert with check (requester = auth.uid() and status = 'pending');

-- Annehmen darf nur, wer gefragt wurde. Die eigene Anfrage selbst zu
-- bestätigen ist damit ausgeschlossen.
drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');

-- Beenden oder ablehnen darf jede der beiden Seiten.
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete using (requester = auth.uid() or addressee = auth.uid());

-- --- daily_shares ---------------------------------------------
drop policy if exists daily_shares_select on public.daily_shares;
create policy daily_shares_select on public.daily_shares
  for select using (user_id = auth.uid() or public.is_friend(user_id));

drop policy if exists daily_shares_insert on public.daily_shares;
create policy daily_shares_insert on public.daily_shares
  for insert with check (user_id = auth.uid());

drop policy if exists daily_shares_update on public.daily_shares;
create policy daily_shares_update on public.daily_shares
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists daily_shares_delete on public.daily_shares;
create policy daily_shares_delete on public.daily_shares
  for delete using (user_id = auth.uid());

-- ============================================================
-- 4 · Aufräumen
-- Alte Tagesstände sind für den Vergleich nach ein paar Wochen wertlos und
-- sollen nicht ewig liegen bleiben. Ohne pg_cron passiert das beim Schreiben.
-- ============================================================

create or replace function public.prune_daily_shares()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.daily_shares
  where user_id = new.user_id and day < current_date - interval '60 days';
  return new;
end;
$$;

revoke all on function public.prune_daily_shares() from public, anon, authenticated;

drop trigger if exists daily_shares_prune on public.daily_shares;
create trigger daily_shares_prune
  after insert on public.daily_shares
  for each row execute function public.prune_daily_shares();
