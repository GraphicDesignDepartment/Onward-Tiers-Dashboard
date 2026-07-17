alter type public.verification_status add value if not exists 'needs_information';
insert into public.tier_definitions(id,display_name,rank,annual_threshold,discount_percent) values('platinum','Onward Industrial — Platinum',5,15000,10) on conflict(id) do update set display_name=excluded.display_name,rank=excluded.rank,annual_threshold=excluded.annual_threshold,discount_percent=excluded.discount_percent,active=true;
insert into public.benefit_definitions(id,name,unit,tier_id,annual_allowance,reseller_only,stackable) values
('platinum_artwork_hours','Artwork hours','hours','platinum',24,false,false),
('platinum_rush_savings','Rush-order savings','75% off','platinum',null,false,false),
('platinum_site_visits','Site visits','visits','platinum',4,false,false),
('platinum_garment_samples','Garment samples','samples','platinum',4,false,false),
('platinum_webstore_discount','Webstore listing discount','10% off','platinum',null,false,false)
on conflict(id) do update set name=excluded.name,unit=excluded.unit,tier_id=excluded.tier_id,annual_allowance=excluded.annual_allowance,active=true;
alter table public.verification_requests add column if not exists submitted_by uuid references public.profiles(id) on delete set null;
alter table public.verification_requests add column if not exists requirements jsonb not null default '{}'::jsonb;
alter table public.verification_requests add column if not exists completed_requirements smallint not null default 0 check(completed_requirements between 0 and 3);
alter table public.verification_requests add column if not exists staff_notes text;
create unique index if not exists verification_requests_account_program_uidx on public.verification_requests(account_id,program);
create or replace function public.submit_reseller_application(p_account_id uuid,p_requirements jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_count int;
begin
 if auth.uid() is null or not public.can_access_account(p_account_id) then raise exception 'Account access denied';end if;
 v_count:=(case when coalesce((p_requirements->>'license')::boolean,false)then 1 else 0 end)+(case when coalesce((p_requirements->>'decorator')::boolean,false)then 1 else 0 end)+(case when coalesce((p_requirements->>'spend')::boolean,false)then 1 else 0 end);
 if v_count<2 then raise exception 'At least two requirements are required';end if;
 insert into public.verification_requests(account_id,program,status,submitted_at,submitted_by,requirements,completed_requirements,notes)
 values(p_account_id,'reseller_decorator','submitted',now(),auth.uid(),p_requirements,v_count,null)
 on conflict(account_id,program) do update set status='submitted',submitted_at=now(),submitted_by=auth.uid(),requirements=excluded.requirements,completed_requirements=v_count,decided_at=null,decided_by=null,staff_notes=null
 returning id into v_id;
 insert into public.audit_events(actor_profile_id,event_type,entity_type,entity_id,details) values(auth.uid(),'reseller_submitted','verification_request',v_id::text,jsonb_build_object('completed_requirements',v_count));
 return v_id;
end;$$;
revoke execute on function public.submit_reseller_application(uuid,jsonb) from public,anon;grant execute on function public.submit_reseller_application(uuid,jsonb) to authenticated;
create or replace function public.review_reseller_application(p_request_id uuid,p_status public.verification_status,p_staff_notes text default null) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_staff() then raise exception 'Staff access required';end if;
 if p_status not in('approved','rejected','needs_information') then raise exception 'Invalid review status';end if;
 update public.verification_requests set status=p_status,staff_notes=p_staff_notes,decided_at=now(),decided_by=auth.uid() where id=p_request_id;
 if not found then raise exception 'Application not found';end if;
 insert into public.audit_events(actor_profile_id,event_type,entity_type,entity_id,details) values(auth.uid(),'reseller_reviewed','verification_request',p_request_id::text,jsonb_build_object('status',p_status,'notes',p_staff_notes));
end;$$;
revoke execute on function public.review_reseller_application(uuid,public.verification_status,text) from public,anon;grant execute on function public.review_reseller_application(uuid,public.verification_status,text) to authenticated;
