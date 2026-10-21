create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.handle_new_user_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users for each row execute function public.handle_new_user_role();

create table public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Açaí do Bairro',
  game_title text not null default 'Monte o seu Açaí',
  primary_color text not null default '#5b1f8a',
  secondary_color text not null default '#7ed321',
  logo_url text,
  discount_percent int not null default 10,
  min_score int not null default 150,
  coupon_days int not null default 7,
  updated_at timestamptz not null default now()
);
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "public read settings" on public.settings for select to anon, authenticated using (true);
create policy "admin update settings" on public.settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.settings (id) values (1);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  score int not null default 0,
  consent boolean not null default true,
  played_on date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  created_at timestamptz not null default now(),
  unique (phone, played_on)
);
grant select on public.players to authenticated;
grant all on public.players to service_role;
alter table public.players enable row level security;
create policy "admin read players" on public.players for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  phone text not null,
  player_id uuid references public.players(id) on delete set null,
  discount_percent int not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'ativo' check (status in ('ativo','usado','expirado')),
  used_at timestamptz
);
grant select, update on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "admin read coupons" on public.coupons for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update coupons" on public.coupons for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "admin upload branding" on storage.objects for insert to authenticated with check (bucket_id='branding' and public.has_role(auth.uid(),'admin'));
create policy "admin update branding" on storage.objects for update to authenticated using (bucket_id='branding' and public.has_role(auth.uid(),'admin'));
create policy "public read branding" on storage.objects for select using (bucket_id='branding');