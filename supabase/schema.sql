-- ChicleControl: ejecutar completo en Supabase > SQL Editor
create extension if not exists pgcrypto;

create table public.maquinas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null check (codigo ~ '^CH[0-9]{3,}$'),
  costo numeric(10,2) not null default 310,
  estado text not null default 'disponible' check (estado in ('disponible','instalada','mantenimiento')),
  fecha_compra date default current_date,
  notas text,
  created_at timestamptz not null default now()
);

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  negocio text not null,
  dueno text not null,
  telefono text,
  direccion text,
  maquina_id uuid unique references public.maquinas(id) on delete set null,
  fecha_instalacion date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.revisiones (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  fecha date not null default current_date,
  recaudo numeric(10,2) not null,                      -- dinero sacado de la máquina
  inversion_chicles numeric(10,2) not null default 0,  -- costo de los chicles repuestos
  porcentaje_dueno numeric(5,2) not null,              -- 10 / 15 / 20 según el mes
  ganancia numeric(10,2) not null,                     -- recaudo - inversion_chicles
  parte_dueno numeric(10,2) not null,
  ganancia_neta numeric(10,2) not null,                -- lo que te queda a ti
  created_at timestamptz not null default now()
);

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('maquina','chicles')),
  codigo text,
  cantidad int not null check (cantidad > 0),
  costo_total numeric(10,2) not null,
  fecha date not null default current_date,
  notas text,
  created_at timestamptz not null default now()
);

create index on public.revisiones (negocio_id, fecha);

-- Seguridad (RLS). INICIO RÁPIDO: acceso abierto con la anon key.
-- Cualquiera con tu anon key podría leer/editar. Antes de publicar, agrega
-- Supabase Auth y cambia "anon" por "authenticated" en estas políticas.
do $$
declare t text;
begin
  foreach t in array array['maquinas','negocios','revisiones','compras'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "acceso_%1$s" on public.%1$I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
