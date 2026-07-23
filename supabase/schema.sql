-- =====================================================================
-- Esquema de base de datos para el Editor de Notas EEFF.
--
-- Cómo usarlo: entra a tu proyecto en supabase.com -> menú "SQL Editor"
-- -> "New query" -> pega TODO este archivo -> botón "Run".
-- Se puede ejecutar una sola vez; si necesitas volver a correrlo, primero
-- borra las tablas o usa un proyecto nuevo.
-- =====================================================================

-- ---------- Tabla de perfiles (rol fijo por usuario) ----------
-- Cada fila corresponde a una persona que inició sesión (auth.users).
-- El rol se asigna manualmente por un administrador desde el Table
-- Editor de Supabase (columna "role" en la tabla profiles), nunca desde
-- la propia aplicación web.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'revisor' check (role in ('escritura', 'revisor')),
  created_at timestamptz not null default now()
);

-- Crea automáticamente una fila en "profiles" cada vez que se invita/crea
-- un usuario nuevo en Supabase Auth. Por defecto queda como "revisor";
-- el administrador debe cambiarlo manualmente a "escritura" si corresponde.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Tabla de fondos ----------
create table if not exists funds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  profile jsonb not null default '[]'::jsonb,
  balance_activos numeric,
  balance_pasivos numeric,
  balance_patrimonio numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Tabla de notas ----------
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references funds (id) on delete cascade,
  kind text not null check (kind in ('nucleo', 'obligatoria', 'condicional', 'adhoc')),
  tag text,
  title text not null,
  content text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_fund_id_idx on notes (fund_id);

-- ---------- Tabla de comentarios/observaciones ----------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes (id) on delete cascade,
  author_id uuid references auth.users (id),
  author_name text not null default 'Revisor',
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_note_id_idx on comments (note_id);

-- =====================================================================
-- Seguridad a nivel de fila (RLS): esto es lo que hace que el rol de
-- cada persona se cumpla de verdad, incluso si alguien manipulara la
-- app desde el navegador. Las reglas se evalúan en la base de datos.
-- =====================================================================
alter table profiles enable row level security;
alter table funds enable row level security;
alter table notes enable row level security;
alter table comments enable row level security;

-- profiles: cualquier persona autenticada puede leer los perfiles
-- (se usa para mostrar nombres de autores de comentarios), pero nadie
-- puede modificarlos desde la app (solo el administrador desde el panel).
create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

-- Función auxiliar: ¿el usuario actual tiene rol de escritura?
create or replace function public.is_escritura()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'escritura'
  );
$$;

-- funds: todos los autenticados pueden ver los fondos;
-- solo "escritura" puede crear/editar/eliminar fondos.
create policy "funds_select_authenticated" on funds
  for select to authenticated using (true);
create policy "funds_write_escritura" on funds
  for insert to authenticated with check (public.is_escritura());
create policy "funds_update_escritura" on funds
  for update to authenticated using (public.is_escritura()) with check (public.is_escritura());
create policy "funds_delete_escritura" on funds
  for delete to authenticated using (public.is_escritura());

-- notes: mismo criterio que funds.
create policy "notes_select_authenticated" on notes
  for select to authenticated using (true);
create policy "notes_write_escritura" on notes
  for insert to authenticated with check (public.is_escritura());
create policy "notes_update_escritura" on notes
  for update to authenticated using (public.is_escritura()) with check (public.is_escritura());
create policy "notes_delete_escritura" on notes
  for delete to authenticated using (public.is_escritura());

-- comments: cualquier autenticado puede leer y agregar observaciones
-- (así el "revisor" puede comentar); solo "escritura" puede resolver
-- (eliminar) un comentario.
create policy "comments_select_authenticated" on comments
  for select to authenticated using (true);
create policy "comments_insert_authenticated" on comments
  for insert to authenticated with check (auth.uid() = author_id);
create policy "comments_delete_escritura" on comments
  for delete to authenticated using (public.is_escritura());
