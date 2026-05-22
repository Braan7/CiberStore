-- ================================================================
-- CiberStore - Supabase Tables Setup
-- Copia y pega esto en: Supabase → SQL Editor → New Query → Run
-- ================================================================

-- USUARIOS
create table if not exists cs_users (
  id         bigserial primary key,
  username   text unique not null,
  pass_hash  text not null,
  ref_code   text,
  spent      numeric default 0,
  orders     int default 0,
  hash_ver   int default 2,
  created    timestamptz default now()
);

-- HISTORIAL DE COMPRAS
create table if not exists cs_history (
  id         bigserial primary key,
  username   text not null references cs_users(username) on delete cascade,
  name       text,
  price      numeric,
  icon       text,
  order_num  text,
  fecha      text,
  created    timestamptz default now()
);

-- PEDIDOS
create table if not exists cs_orders (
  id         bigserial primary key,
  username   text not null,
  product    text,
  price      numeric,
  order_num  text,
  status     text default 'pendiente',
  fecha      text,
  created    timestamptz default now()
);

-- RESEÑAS
create table if not exists cs_resenas (
  id         bigserial primary key,
  username   text not null,
  servicio   text,
  stars      int,
  texto      text,
  fecha      text,
  created    timestamptz default now()
);

-- CHAT COMUNIDAD
create table if not exists cs_chat (
  id         bigserial primary key,
  username   text not null,
  text       text,
  likes      int default 0,
  fecha      text,
  created    timestamptz default now()
);

-- CODIGOS PROMO
create table if not exists cs_promo_codes (
  id         bigserial primary key,
  code       text unique not null,
  disc       int,
  max_uses   int default 100,
  uses       int default 0,
  descr      text,
  active     boolean default true,
  created    timestamptz default now()
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) - Acceso publico controlado
-- ================================================================

alter table cs_users        enable row level security;
alter table cs_history      enable row level security;
alter table cs_orders       enable row level security;
alter table cs_resenas      enable row level security;
alter table cs_chat         enable row level security;
alter table cs_promo_codes  enable row level security;

-- Policies: acceso publico con anon key
create policy "public_users"       on cs_users       for all using (true) with check (true);
create policy "public_history"     on cs_history     for all using (true) with check (true);
create policy "public_orders"      on cs_orders      for all using (true) with check (true);
create policy "public_resenas"     on cs_resenas     for all using (true) with check (true);
create policy "public_chat"        on cs_chat        for all using (true) with check (true);
create policy "public_promo_codes" on cs_promo_codes for all using (true) with check (true);

-- ================================================================
-- INDEXES para mejor performance
-- ================================================================
create index if not exists idx_users_username  on cs_users(username);
create index if not exists idx_history_user    on cs_history(username);
create index if not exists idx_orders_user     on cs_orders(username);
create index if not exists idx_chat_created    on cs_chat(created desc);
create index if not exists idx_resenas_created on cs_resenas(created desc);
create index if not exists idx_codes_code      on cs_promo_codes(code);
