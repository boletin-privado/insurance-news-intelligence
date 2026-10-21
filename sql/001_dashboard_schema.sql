-- Insurance News Intelligence - esquema del dashboard
-- Ejecutar una vez en Supabase SQL Editor con un usuario administrador.

-- ---------------------------------------------------------------------------
-- 1. Bandera compartida en la tabla de noticias existente
-- ---------------------------------------------------------------------------

alter table public.news
  add column if not exists is_flagged boolean not null default false;

alter table public.news
  add column if not exists flagged_at timestamptz;

alter table public.news
  add column if not exists flagged_by uuid references auth.users(id) on delete set null;

create index if not exists news_is_flagged_idx
  on public.news (is_flagged)
  where is_flagged = true;

create index if not exists news_email_date_dashboard_idx
  on public.news (email_date desc);

create index if not exists news_companies_dashboard_idx
  on public.news using gin (companies);

-- ---------------------------------------------------------------------------
-- 2. Catálogo jerárquico de grupos y entidades
-- ---------------------------------------------------------------------------

create table if not exists public.company_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text not null check (kind in ('group', 'entity')),
  parent_id uuid references public.company_catalog(id) on delete set null,
  match_names text[] not null default '{}'::text[],
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_catalog_parent_check check (parent_id is null or kind = 'entity')
);

create index if not exists company_catalog_parent_idx
  on public.company_catalog (parent_id);

create index if not exists company_catalog_match_names_idx
  on public.company_catalog using gin (match_names);

-- ---------------------------------------------------------------------------
-- 3. Preferencias de cada usuario
-- ---------------------------------------------------------------------------

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_period_days integer not null default 30
    check (default_period_days in (0, 7, 30, 90, 365)),
  show_sponsored boolean not null default true,
  page_size integer not null default 25
    check (page_size in (10, 25, 50)),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_default_companies (
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.company_catalog(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create index if not exists user_default_companies_user_idx
  on public.user_default_companies (user_id);

-- ---------------------------------------------------------------------------
-- 4. Triggers auxiliares
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists company_catalog_set_updated_at on public.company_catalog;
create trigger company_catalog_set_updated_at
before update on public.company_catalog
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create or replace function public.handle_new_dashboard_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_dashboard_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_dashboard on auth.users;
create trigger on_auth_user_created_dashboard
after insert on auth.users
for each row execute function public.handle_new_dashboard_user();

-- Crear preferencias para usuarios que ya existían antes de esta migración.
insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Mantener el catálogo actualizado cuando Apps Script inserte nuevas noticias.
create or replace function public.register_news_companies()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.company_catalog (name, slug, kind, parent_id, match_names, sort_order)
  select distinct
    company_name,
    'unclassified-' || substr(md5(company_name), 1, 16),
    'entity',
    null::uuid,
    array[company_name]::text[],
    500
  from (
    select trim(raw_name) as company_name
    from unnest(coalesce(new.companies, '{}'::text[])) as raw_name
  ) as incoming
  where company_name <> ''
    and not exists (
      select 1
      from public.company_catalog as catalog
      where company_name = any(catalog.match_names)
    )
  on conflict (slug) do nothing;

  return new;
end;
$$;

revoke execute on function public.register_news_companies() from public, anon, authenticated;

drop trigger if exists news_register_companies_insert on public.news;
create trigger news_register_companies_insert
after insert on public.news
for each row execute function public.register_news_companies();

drop trigger if exists news_register_companies_update on public.news;
create trigger news_register_companies_update
after update of companies on public.news
for each row execute function public.register_news_companies();

-- ---------------------------------------------------------------------------
-- 5. Función segura para cambiar únicamente la bandera compartida
-- ---------------------------------------------------------------------------

create or replace function public.set_news_flag(
  p_news_id uuid,
  p_is_flagged boolean
)
returns table (
  news_id uuid,
  is_flagged boolean,
  flagged_at timestamptz,
  flagged_by uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  return query
  update public.news as n
  set
    is_flagged = p_is_flagged,
    flagged_at = case when p_is_flagged then now() else null end,
    flagged_by = case when p_is_flagged then (select auth.uid()) else null end
  where n.id = p_news_id
  returning n.id, n.is_flagged, n.flagged_at, n.flagged_by;
end;
$$;

revoke execute on function public.set_news_flag(uuid, boolean) from public, anon;
grant execute on function public.set_news_flag(uuid, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security y privilegios mínimos
-- ---------------------------------------------------------------------------

alter table public.news enable row level security;
alter table public.company_catalog enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_default_companies enable row level security;

grant usage on schema public to authenticated, service_role;

-- Noticias: el navegador solo lee. La escritura normal sigue en Apps Script.
revoke all on table public.news from anon;
revoke insert, update, delete, truncate, references, trigger on table public.news from authenticated;
grant select on table public.news to authenticated;
grant all on table public.news to service_role;

-- Catálogo: lectura para usuarios; mantenimiento administrativo desde Supabase.
revoke all on table public.company_catalog from anon;
grant select on table public.company_catalog to authenticated;
grant all on table public.company_catalog to service_role;

-- Preferencias: cada usuario gestiona únicamente las suyas mediante RLS.
revoke all on table public.user_preferences from anon;
grant select, insert, update on table public.user_preferences to authenticated;
grant all on table public.user_preferences to service_role;

revoke all on table public.user_default_companies from anon;
grant select, insert, delete on table public.user_default_companies to authenticated;
grant all on table public.user_default_companies to service_role;

-- Política de lectura global para cualquier usuario autenticado.
drop policy if exists "Authenticated users can read all news" on public.news;
create policy "Authenticated users can read all news"
on public.news
for select
to authenticated
using (true);

-- Catálogo visible para cualquier usuario autenticado.
drop policy if exists "Authenticated users can read company catalog" on public.company_catalog;
create policy "Authenticated users can read company catalog"
on public.company_catalog
for select
to authenticated
using (true);

-- Preferencias propias.
drop policy if exists "Users can read own preferences" on public.user_preferences;
create policy "Users can read own preferences"
on public.user_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own preferences" on public.user_preferences;
create policy "Users can create own preferences"
on public.user_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update own preferences"
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Compañías predeterminadas propias.
drop policy if exists "Users can read own default companies" on public.user_default_companies;
create policy "Users can read own default companies"
on public.user_default_companies
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can add own default companies" on public.user_default_companies;
create policy "Users can add own default companies"
on public.user_default_companies
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own default companies" on public.user_default_companies;
create policy "Users can delete own default companies"
on public.user_default_companies
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 7. Realtime opcional: propaga cambios de bandera a sesiones abiertas
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    execute 'create publication supabase_realtime';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'news'
  ) then
    execute 'alter publication supabase_realtime add table public.news';
  end if;
end
$$;
