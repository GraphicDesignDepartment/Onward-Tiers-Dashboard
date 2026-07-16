create table public.public_brand_settings(id text primary key,anniversary_years integer not null default 2 check(anniversary_years between 1 and 100),updated_at timestamptz not null default now());
insert into public.public_brand_settings(id,anniversary_years) values('signin',2);
alter table public.public_brand_settings enable row level security;
create policy brand_settings_public_read on public.public_brand_settings for select to anon,authenticated using(true);
create policy brand_settings_staff_update on public.public_brand_settings for update to authenticated using(public.is_staff()) with check(public.is_staff());
revoke all on public.public_brand_settings from anon,authenticated;
grant select on public.public_brand_settings to anon,authenticated;
grant update(anniversary_years) on public.public_brand_settings to authenticated;
