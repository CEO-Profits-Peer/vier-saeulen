-- Vier Säulen — Erinnerungen (Web Push)
-- SQL Editor → New query → alles einfügen → Run. Läuft mehrfach durch.
--
-- Aufbau: Die Datenbank prüft stündlich, wer dran ist, und ruft die Vercel-
-- Route auf, die den Push signiert und zustellt. Warum nicht Vercel-Cron?
-- Auf dem Hobby-Plan läuft der nur einmal täglich — zu grob für „21:00 in
-- deiner Zeitzone“, und bei Sommerzeit verschiebt sich der Termin.

-- ============================================================
-- 1 · Erweiterungen
-- pg_cron plant, pg_net stellt den ausgehenden Aufruf.
-- ============================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ============================================================
-- 2 · Tabelle
-- Ein Eintrag je Gerät: dasselbe Konto auf Handy und Laptop bekommt zwei.
-- ============================================================
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- Die Endpunkt-URL identifiziert das Gerät eindeutig.
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  -- Zeitzone des Geräts, damit 21:00 auch 21:00 vor Ort heißt.
  tz           text not null default 'Europe/Vienna',
  hour         int  not null default 21 check (hour between 0 and 23),
  enabled      boolean not null default true,
  -- Verhindert zwei Erinnerungen am selben Tag.
  last_sent_on date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists push_insert on public.push_subscriptions;
create policy push_insert on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists push_update on public.push_subscriptions;
create policy push_update on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_delete on public.push_subscriptions;
create policy push_delete on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- ============================================================
-- 3 · Wer ist dran?
--
-- security definer, weil der Cron-Job über alle Zeilen laufen muss — RLS würde
-- ihm nur die eigenen zeigen, und er hat gar keine. Ausführungsrecht bekommt
-- deshalb ausdrücklich niemand ausser der Datenbank selbst.
-- ============================================================
create or replace function public.due_reminders()
returns table (id uuid, endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
as $$
  select s.id, s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  where s.enabled
    and extract(hour from (now() at time zone s.tz))::int = s.hour
    and (s.last_sent_on is null or s.last_sent_on < (now() at time zone s.tz)::date)
  limit 500;
$$;

revoke all on function public.due_reminders() from public, anon, authenticated;

create or replace function public.mark_reminders_sent(ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subscriptions s
  set last_sent_on = (now() at time zone s.tz)::date,
      updated_at = now()
  where s.id = any(ids);
$$;

revoke all on function public.mark_reminders_sent(uuid[]) from public, anon, authenticated;

-- ============================================================
-- 4 · Der stündliche Anstoß
--
-- Vor dem Ausführen die beiden Werte unten setzen — einmalig, als Superuser
-- im SQL Editor:
--
--   alter database postgres set app.push_url    = 'https://routines-peer.vercel.app/api/push/send';
--   alter database postgres set app.push_secret = '<dein CRON_SECRET>';
--
-- Danach diese Datei erneut laufen lassen. current_setting(..., true) gibt
-- null zurück statt zu scheitern, falls einer fehlt — dann passiert nichts.
-- ============================================================
create or replace function public.dispatch_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  ids uuid[];
  target text := current_setting('app.push_url', true);
  secret text := current_setting('app.push_secret', true);
begin
  if target is null or secret is null then
    raise notice 'app.push_url oder app.push_secret fehlt — Erinnerungen bleiben aus';
    return;
  end if;

  select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb), coalesce(array_agg(d.id), '{}')
    into payload, ids
  from public.due_reminders() d;

  if jsonb_array_length(payload) = 0 then
    return;
  end if;

  perform net.http_post(
    url     := target,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body    := jsonb_build_object('subs', payload)
  );

  -- Bewusst sofort markieren: kommt eine Zustellung nicht an, fehlt eine
  -- Erinnerung. Beim umgekehrten Weg käme sie im Zweifel mehrfach, und das
  -- nervt mehr, als eine ausgelassene fehlt.
  perform public.mark_reminders_sent(ids);
end;
$$;

revoke all on function public.dispatch_reminders() from public, anon, authenticated;

-- Alten Job entfernen, damit ein zweiter Durchlauf nicht doppelt plant.
select cron.unschedule('vier-saeulen-reminders')
where exists (select 1 from cron.job where jobname = 'vier-saeulen-reminders');

select cron.schedule(
  'vier-saeulen-reminders',
  '5 * * * *',                      -- jede Stunde um :05
  $$ select public.dispatch_reminders(); $$
);

-- Kontrolle:
--   select jobid, jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 5;
