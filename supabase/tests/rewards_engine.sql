-- Run against the development database after the anonymized seed migration.
do $$
declare
  actual jsonb;
begin
  select jsonb_object_agg(tier, accounts) into actual
  from (
    select coalesce(ct.tier_id, 'no_tier') as tier, count(*) as accounts
    from public.reward_accounts a
    left join public.account_current_tiers ct on ct.account_id = a.id
    where a.normalized_key like 'demo-account-%'
    group by coalesce(ct.tier_id, 'no_tier')
  ) distribution;

  if actual <> '{"gold":3,"silver":7,"bronze":44,"beginner":248,"no_tier":2}'::jsonb then
    raise exception 'Unexpected tier distribution: %', actual;
  end if;

  if (select qualifying_spend from public.orders where external_order_number='DEMO-EXCLUDED-BLANKS') <> 0 then
    raise exception 'Onward Blanks order incorrectly qualifies';
  end if;

  if (select qualifying_spend from public.orders where external_order_number='DEMO-EXCLUDED-UNPAID') <> 0 then
    raise exception 'Unpaid order incorrectly qualifies';
  end if;

  if (select qualifying_spend from public.orders where external_order_number='DEMO-00001') <> 5500 then
    raise exception 'Tax/shipping/fee deduction is incorrect';
  end if;

  if (select sum(qualifying_spend) from public.orders where account_id=md5('onward-demo-account-12')::uuid and extract(year from ordered_at)=2026) <> 750 then
    raise exception 'Vincent proof spend must equal 750';
  end if;
  if (select sum(savings_amount) from public.orders where account_id=md5('onward-demo-account-12')::uuid and extract(year from ordered_at)=2026) <> 35 then
    raise exception 'Vincent proof savings must equal 35';
  end if;
  if (select count(*) from public.orders where account_id=md5('onward-demo-account-12')::uuid and extract(year from ordered_at)=2026 and qualifying_spend>0) <> 4 then
    raise exception 'Vincent proof must contain four qualifying orders';
  end if;
end;
$$;
