create table public.notification_channel_settings(
  id text primary key,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint notification_settings_singleton check(id='default')
);
insert into public.notification_channel_settings(id,email_enabled)values('default',false)on conflict(id)do update set email_enabled=false,updated_at=now();
alter table public.notification_channel_settings enable row level security;
create policy notification_settings_staff_read on public.notification_channel_settings for select to authenticated using(public.is_staff());
grant select on public.notification_channel_settings to authenticated;
revoke all on public.notification_channel_settings from anon;
update public.notification_deliveries set status='suppressed',error_code='email_channel_disabled'where channel='email'and status in('pending','failed','processing');
create or replace function public.enqueue_notification(p_profile uuid,p_event text,p_title text,p_body text,p_entity_type text,p_entity_id text,p_action_path text,p_dedupe text)returns uuid language plpgsql security definer set search_path=public as $$declare n uuid;email_on boolean;begin insert into public.notifications(profile_id,event_type,title,body,entity_type,entity_id,action_path,dedupe_key)values(p_profile,p_event,p_title,p_body,p_entity_type,p_entity_id,p_action_path,p_dedupe)on conflict(dedupe_key)do update set dedupe_key=excluded.dedupe_key returning id into n;insert into public.notification_deliveries(notification_id,channel,status)values(n,'in_app','sent')on conflict(notification_id,channel)do nothing;select email_enabled into email_on from public.notification_channel_settings where id='default';if coalesce(email_on,false)then insert into public.notification_deliveries(notification_id,channel,status)values(n,'email','pending')on conflict(notification_id,channel)do nothing;end if;return n;end$$;
revoke execute on function public.enqueue_notification(uuid,text,text,text,text,text,text,text)from public,anon,authenticated;
