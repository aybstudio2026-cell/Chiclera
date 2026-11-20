-- ChicleControl: ejecutar completo en Supabase > SQL Editor
-- Todo queda dentro del schema "chiclera" (no en public).
create extension if not exists pgcrypto;

create schema if not exists chiclera;

create table chiclera.maquinas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null check (codigo ~ '^CH[0-9]{3,}$'),
  costo numeric(10,2) not null default 310,
  estado text not null default 'disponible' check (estado in ('disponible','instalada','mantenimiento')),
  fecha_compra date default current_date,
  notas text,
  created_at timestamptz not null default now()
);

create table chiclera.negocios (
  id uuid primary key default gen_random_uuid(),
  negocio text not null,
  dueno text not null,
  telefono text,
  direccion text,
  lat numeric(10,6),
  lng numeric(10,6),
  maquina_id uuid unique references chiclera.maquinas(id) on delete set null,
  fecha_instalacion date not null default current_date,
  created_at timestamptz not null default now()
);

create table chiclera.revisiones (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references chiclera.negocios(id) on delete cascade,
  fecha date not null default current_date,
  recaudo numeric(10,2) not null,                      -- dinero sacado de la máquina
  inversion_chicles numeric(10,2) not null default 0,  -- costo de los chicles repuestos
  porcentaje_dueno numeric(5,2) not null,              -- 10 / 15 / 20 según el mes
  ganancia numeric(10,2) not null,                     -- recaudo - inversion_chicles
  parte_dueno numeric(10,2) not null,
  ganancia_neta numeric(10,2) not null,                -- lo que te queda a ti
  created_at timestamptz not null default now()
);

create table chiclera.compras (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('maquina','chicles')),
  codigo text,
  cantidad int not null check (cantidad > 0),
  costo_total numeric(10,2) not null,
  fecha date not null default current_date,
  notas text,
  created_at timestamptz not null default now()
);

create table chiclera.mantenimientos (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references chiclera.maquinas(id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null,
  costo numeric(10,2) not null default 0,
  notas text,
  resuelto boolean not null default true,
  created_at timestamptz not null default now()
);

create index on chiclera.revisiones (negocio_id, fecha);
create index on chiclera.mantenimientos (maquina_id, fecha);

-- Permisos para que la API de Supabase pueda usar el schema
grant usage on schema chiclera to anon, authenticated, service_role;
grant all on all tables in schema chiclera to anon, authenticated, service_role;
grant all on all sequences in schema chiclera to anon, authenticated, service_role;
alter default privileges in schema chiclera grant all on tables to anon, authenticated, service_role;
alter default privileges in schema chiclera grant all on sequences to anon, authenticated, service_role;

-- Seguridad (RLS). INICIO RÁPIDO: acceso abierto con la anon key.
-- Cualquiera con tu anon key podría leer/editar. Antes de publicar, agrega
-- Supabase Auth y cambia "anon" por "authenticated" en estas políticas.
do $$
declare t text;
begin
  foreach t in array array['maquinas','negocios','revisiones','compras','mantenimientos'] loop
    execute format('alter table chiclera.%I enable row level security', t);
    execute format('create policy "acceso_%1$s" on chiclera.%1$I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- PASOS EXTRA (obligatorios):
-- 1) Supabase > Project Settings > API > "Exposed schemas": agrega "chiclera" y guarda.
-- 2) En src/lib/db.js crea el cliente así:
--    createClient(url, key, { db: { schema: 'chiclera' } })
--
-- 3) Si ya tenías la base de datos creada anteriormente, corre esto para añadir las columnas de GPS:
--    alter table chiclera.negocios add column if not exists lat numeric(10,6);
--    alter table chiclera.negocios add column if not exists lng numeric(10,6);

