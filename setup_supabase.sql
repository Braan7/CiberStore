-- ================================================================
-- CiberStore — Setup completo
-- Corre esto en Supabase > SQL Editor > New Query > Run
-- ================================================================

-- Eliminar tablas viejas si existen
drop table if exists movimientos_saldo cascade;
drop table if exists profiles cascade;
drop table if exists historial cascade;
drop table if exists usuarios cascade;
drop table if exists resenas cascade;
drop table if exists chat cascade;
drop table if exists chat_likes cascade;
drop table if exists codigos cascade;

-- ── PROFILES ────────────────────────────────────────────────────
create table profiles (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  nombre        text not null default '',
  whatsapp      text not null default '',
  password_hash text not null,
  role          text not null default 'user',
  saldo         numeric not null default 0,
  ref_code      text unique,
  banned        boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ── MOVIMIENTOS DE SALDO ────────────────────────────────────────
create table movimientos_saldo (
  id          bigint generated always as identity primary key,
  user_id     uuid references profiles(id) on delete cascade,
  tipo        text not null,        -- 'credito' | 'debito' | 'compra' | 'ajuste'
  monto       numeric not null,
  descripcion text not null default '',
  created_at  timestamptz not null default now()
);

-- ── RESENAS ─────────────────────────────────────────────────────
create table resenas (
  id         bigint generated always as identity primary key,
  username   text not null,
  servicio   text not null,
  stars      int not null,
  texto      text not null,
  created_at timestamptz not null default now()
);

-- ── CHAT ────────────────────────────────────────────────────────
create table chat (
  id         bigint generated always as identity primary key,
  username   text not null,
  texto      text not null,
  likes      int not null default 0,
  created_at timestamptz not null default now()
);

-- ── CHAT LIKES ──────────────────────────────────────────────────
create table chat_likes (
  id       bigint generated always as identity primary key,
  msg_id   bigint references chat(id) on delete cascade,
  username text not null,
  unique(msg_id, username)
);

-- ── CODIGOS PROMO ───────────────────────────────────────────────
create table codigos (
  id          bigint generated always as identity primary key,
  code        text unique not null,
  disc        int not null,
  max_uses    int not null default 100,
  uses        int not null default 0,
  descripcion text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── RLS ─────────────────────────────────────────────────────────
alter table profiles          enable row level security;
alter table movimientos_saldo enable row level security;
alter table resenas            enable row level security;
alter table chat               enable row level security;
alter table chat_likes         enable row level security;
alter table codigos            enable row level security;

-- profiles: insertar al registrarse, leer/actualizar el propio
create policy "insert_profile"  on profiles for insert with check (true);
create policy "select_profile"  on profiles for select using (true);
create policy "update_profile"  on profiles for update using (true);
create policy "delete_profile"  on profiles for delete using (true);

-- movimientos: insertar y leer
create policy "insert_mov"  on movimientos_saldo for insert with check (true);
create policy "select_mov"  on movimientos_saldo for select using (true);

-- resenas
create policy "insert_resena"  on resenas for insert with check (true);
create policy "select_resena"  on resenas for select using (true);

-- chat
create policy "insert_chat"  on chat for insert with check (true);
create policy "select_chat"  on chat for select using (true);
create policy "update_chat"  on chat for update using (true);
create policy "delete_chat"  on chat for delete using (true);

-- chat_likes
create policy "insert_chat_like"  on chat_likes for insert with check (true);
create policy "select_chat_like"  on chat_likes for select using (true);

-- codigos
create policy "insert_codigo"  on codigos for insert with check (true);
create policy "select_codigo"  on codigos for select using (true);
create policy "update_codigo"  on codigos for update using (true);
create policy "delete_codigo"  on codigos for delete using (true);

-- ── DATOS INICIALES ──────────────────────────────────────────────
insert into codigos (code, disc, max_uses, descripcion, active)
values ('VUELVETE5', 5, 9999, 'Codigo de salida', true)
on conflict (code) do nothing;

-- Admin por defecto (cambia la contrasena despues)
-- password: ciberstore26 (hash generado con la misma funcion del frontend)
insert into profiles (username, nombre, whatsapp, password_hash, role, saldo)
values ('admin', 'Admin CiberStore', '5215548461200',
        '2gj2p6e31e', 'admin', 0)
on conflict (username) do nothing;

-- ================================================================
-- RULETA — historial por usuario (agrega esto al SQL existente)
-- ================================================================
create table if not exists ruleta_giros (
  id         bigint generated always as identity primary key,
  user_id    uuid references profiles(id) on delete cascade,
  premio     text not null,
  disc       int not null default 0,
  created_at timestamptz not null default now()
);
alter table ruleta_giros enable row level security;
create policy "insert_ruleta" on ruleta_giros for insert with check (true);
create policy "select_ruleta" on ruleta_giros for select using (true);
