-- Comprobaciones posteriores a la instalación.

select
  count(*) as total_news,
  count(*) filter (where is_flagged) as flagged_news,
  max(imported_at) as last_import
from public.news;

select kind, count(*)
from public.company_catalog
where active
 group by kind
order by kind;

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('news', 'company_catalog', 'user_preferences', 'user_default_companies')
order by table_name, grantee, privilege_type;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('news', 'company_catalog', 'user_preferences', 'user_default_companies')
order by tablename, policyname;

select *
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'news';
