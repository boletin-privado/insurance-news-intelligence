-- Catálogo inicial de grupos y entidades.
-- Se puede volver a ejecutar: utiliza UPSERT por slug.

-- Grupos principales
insert into public.company_catalog (name, slug, kind, parent_id, match_names, sort_order)
values
  ('AXA', 'axa', 'group', null, array['AXA', 'Axa', 'Grupo AXA'], 10),
  ('Línea Directa', 'linea-directa', 'group', null, array['Línea Directa', 'Linea Directa'], 20),
  ('Allianz', 'allianz', 'group', null, array['Allianz', 'Allianz Seguros'], 30),
  ('Helvetia', 'helvetia', 'group', null, array['Helvetia', 'Helvetia Seguros'], 40),
  ('Mapfre', 'mapfre', 'group', null, array['Mapfre', 'MAPFRE'], 50),
  ('Ocaso', 'ocaso', 'group', null, array['Ocaso', 'Seguros Ocaso'], 60)
on conflict (slug) do update
set
  name = excluded.name,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  match_names = excluded.match_names,
  sort_order = excluded.sort_order,
  active = true;

-- Entidades AXA
insert into public.company_catalog (name, slug, kind, parent_id, match_names, sort_order)
values
  ('AXA España', 'axa-espana', 'entity', (select id from public.company_catalog where slug = 'axa'), array['AXA España'], 11),
  ('AXA XL', 'axa-xl', 'entity', (select id from public.company_catalog where slug = 'axa'), array['AXA XL'], 12),
  ('AXA Vida', 'axa-vida', 'entity', (select id from public.company_catalog where slug = 'axa'), array['AXA Vida'], 13)
on conflict (slug) do update
set
  name = excluded.name,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  match_names = excluded.match_names,
  sort_order = excluded.sort_order,
  active = true;

-- Entidades Línea Directa
insert into public.company_catalog (name, slug, kind, parent_id, match_names, sort_order)
values
  ('Línea Directa Aseguradora', 'linea-directa-aseguradora', 'entity', (select id from public.company_catalog where slug = 'linea-directa'), array['Línea Directa Aseguradora', 'Linea Directa Aseguradora'], 21)
on conflict (slug) do update
set
  name = excluded.name,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  match_names = excluded.match_names,
  sort_order = excluded.sort_order,
  active = true;

-- Entidades Allianz
insert into public.company_catalog (name, slug, kind, parent_id, match_names, sort_order)
values
  ('Allianz Commercial', 'allianz-commercial', 'entity', (select id from public.company_catalog where slug = 'allianz'), array['Allianz Commercial'], 31)
on conflict (slug) do update
set
  name = excluded.name,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  match_names = excluded.match_names,
  sort_order = excluded.sort_order,
  active = true;

-- Entidades Helvetia
insert into public.company_catalog (name, slug, kind, parent_id, match_names, sort_order)
values
  ('Caser', 'caser', 'entity', (select id from public.company_catalog where slug = 'helvetia'), array['Caser', 'Helvetia Caser'], 41)
on conflict (slug) do update
set
  name = excluded.name,
  kind = excluded.kind,
  parent_id = excluded.parent_id,
  match_names = excluded.match_names,
  sort_order = excluded.sort_order,
  active = true;

-- Añadir cualquier nombre histórico que aún no esté cubierto por match_names.
-- Se incorpora como entidad sin grupo para que no desaparezca del selector.
insert into public.company_catalog (name, slug, kind, parent_id, match_names, sort_order)
select distinct
  trim(company_name) as name,
  'unclassified-' || substr(md5(trim(company_name)), 1, 16) as slug,
  'entity' as kind,
  null::uuid as parent_id,
  array[trim(company_name)]::text[] as match_names,
  500 as sort_order
from public.news
cross join lateral unnest(coalesce(companies, '{}'::text[])) as company_name
where trim(company_name) <> ''
  and not exists (
    select 1
    from public.company_catalog as catalog
    where trim(company_name) = any(catalog.match_names)
  )
on conflict (slug) do nothing;
