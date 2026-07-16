-- Expand Demo Company 012 into a complete authenticated dashboard proof.
do $$
declare a uuid:=md5('onward-demo-account-12')::uuid;
begin
 update public.orders set amount_billed=320,tax_total=10,shipping_total=5,rush_order_cost=2,other_fee_total=3,coupon_discount=12,final_discount=8,order_label='Team launch apparel',ordered_at='2026-01-22 15:00:00-05',paid_at='2026-01-22 15:00:00-05' where external_order_number='DEMO-00012';
 insert into public.orders(id,import_run_id,external_order_number,account_id,site_id,site_name,order_type,status,ordered_at,paid_at,amount_billed,tax_total,shipping_total,rush_order_cost,other_fee_total,coupon_discount,final_discount,order_label,raw_payload) values
 (md5('vincent-proof-2')::uuid,'00000000-0000-0000-0000-000000000001','DEMO-VIN-002',a,'22643266','OnwardCustoms','Business Hub Order','Paid in full','2026-03-14 14:00:00-04','2026-03-14 14:00:00-04',220,10,5,2,3,6,4,'Spring event shirts','{"demo":true}'::jsonb),
 (md5('vincent-proof-3')::uuid,'00000000-0000-0000-0000-000000000001','DEMO-VIN-003',a,'23757026','Fictional Hosted Webstore','Internet Order','Paid in full','2026-05-21 14:00:00-04','2026-05-21 14:00:00-04',170,10,5,2,3,5,0,'Volunteer polos','{"demo":true}'::jsonb),
 (md5('vincent-proof-4')::uuid,'00000000-0000-0000-0000-000000000001','DEMO-VIN-004',a,'22643266','OnwardCustoms','Business Hub Order','Paid in full','2026-07-08 14:00:00-04','2026-07-08 14:00:00-04',120,10,5,2,3,0,0,'Logo refresh order','{"demo":true}'::jsonb)
 on conflict(external_order_number) do nothing;
 insert into public.reward_ledger(id,account_id,reward_type,amount,description,expires_at) values
 (md5('vincent-referral-grant')::uuid,a,'referral_credit_usd',50,'Fictional completed referral','2027-12-31 23:59:59-05'),
 (md5('vincent-referral-use')::uuid,a,'referral_credit_usd',-15,'Fictional credit redemption',null)
 on conflict(id) do nothing;
 insert into public.benefit_usage(id,account_id,benefit_id,quantity,usage_year,description,used_at) values(md5('vincent-artwork-use')::uuid,a,'bronze_artwork_hours',0.5,2026,'Fictional artwork support','2026-04-10 14:00:00-04') on conflict(id) do nothing;
 insert into public.account_discounts(account_id,discount_id,status,verified_at) values
 (a,'new-business','verified','2026-01-01 12:00:00-05'),(a,'educator','available',null),(a,'nonprofit','available',null),(a,'promise-review','available',null),(a,'cash-check','available',null)
 on conflict(account_id,discount_id) do update set status=excluded.status,verified_at=excluded.verified_at;
 perform public.rebuild_tier_achievements(a);
 update public.profiles set role='admin' where id=(select id from auth.users where lower(email)=lower('vincent@onwardcustoms.com') limit 1);
end; $$;
