-- 0001_listings.sql — общая витрина товаров (local-first маркет на Supabase).
-- Идемпотентно: можно прогонять повторно (drop policy if exists перед create).
-- Применять: Dashboard → SQL Editor → вставить → Run.

create table if not exists public.listings (
  id text primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  status text not null default 'available',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.listings enable row level security;

-- Читать живые лоты (не проданные) — может кто угодно, даже без входа.
drop policy if exists "read live listings" on public.listings;
create policy "read live listings" on public.listings
  for select using (status <> 'sold');

-- Писать / править / удалять — только свои товары (owner = auth.uid()).
drop policy if exists "insert own listings" on public.listings;
create policy "insert own listings" on public.listings
  for insert with check (owner = auth.uid());

drop policy if exists "update own listings" on public.listings;
create policy "update own listings" on public.listings
  for update using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "delete own listings" on public.listings;
create policy "delete own listings" on public.listings
  for delete using (owner = auth.uid());

grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;

create index if not exists listings_status_updated_idx
  on public.listings (status, updated_at desc);
