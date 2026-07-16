-- Anonymized proof dataset matching the provisional tier distribution.
-- Contains no customer CSV values or production PII.

do $$
declare
  demo_import_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.import_runs (
    id, file_name, file_sha256, status, started_at, completed_at,
    rows_received, rows_inserted, summary
  ) values (
    demo_import_id,
    'anonymized-proof-data.csv',
    encode(digest('onward-anonymized-proof-data-v1', 'sha256'), 'hex'),
    'completed', now(), now(), 306, 306,
    jsonb_build_object(
      'data_classification', 'anonymized',
      'expected_gold', 3,
      'expected_silver', 7,
      'expected_bronze', 44,
      'expected_beginner', 248,
      'expected_no_tier', 2
    )
  );

  insert into public.reward_accounts (id, kind, display_name, normalized_key)
  select
    md5('onward-demo-account-' || n::text)::uuid,
    case when n <= 91 then 'company'::public.account_kind else 'individual'::public.account_kind end,
    case when n <= 91
      then 'Demo Company ' || lpad(n::text, 3, '0')
      else 'Demo Customer ' || lpad((n - 91)::text, 3, '0')
    end,
    'demo-account-' || lpad(n::text, 3, '0')
  from generate_series(1, 304) as n;

  insert into public.companies (id, legal_name, normalized_name)
  select id, display_name, normalized_key
  from public.reward_accounts
  where kind = 'company' and normalized_key like 'demo-account-%';

  insert into public.orders (
    id, import_run_id, external_order_number, account_id,
    site_id, site_name, order_type, status, ordered_at, paid_at,
    amount_billed, tax_total, shipping_total, rush_order_cost, other_fee_total,
    raw_payload
  )
  select
    md5('onward-demo-order-' || n::text)::uuid,
    demo_import_id,
    'DEMO-' || lpad(n::text, 5, '0'),
    md5('onward-demo-account-' || n::text)::uuid,
    case
      when n % 7 = 0 then '23757026'
      when n % 11 = 0 then '27493941'
      else '22643266'
    end,
    case
      when n % 7 = 0 then 'Fictional Hosted Webstore'
      when n % 11 = 0 then 'Fictional Community Store'
      else 'OnwardCustoms'
    end,
    case when n % 2 = 0 then 'Internet Order' else 'Business Hub Order' end,
    'Paid in full',
    case when n % 2 = 0
      then make_timestamptz(2026, 1 + (n % 7), 1 + (n % 20), 15, 0, 0, 'America/New_York')
      else make_timestamptz(2025, 6 + (n % 7), 1 + (n % 20), 15, 0, 0, 'America/New_York')
    end,
    case when n % 2 = 0
      then make_timestamptz(2026, 1 + (n % 7), 2 + (n % 19), 15, 0, 0, 'America/New_York')
      else make_timestamptz(2025, 6 + (n % 7), 2 + (n % 19), 15, 0, 0, 'America/New_York')
    end,
    (case
      when n <= 3 then 5500
      when n <= 10 then 3000
      when n <= 54 then 750
      when n <= 302 then 100
      else 0
    end) + 20,
    10, 5, 2, 3,
    jsonb_build_object('demo', true, 'contains_pii', false)
  from generate_series(1, 304) as n;

  -- A paid Onward Blanks order must contribute zero qualifying spend.
  insert into public.orders (
    id, import_run_id, external_order_number, account_id, site_id, site_name,
    order_type, status, ordered_at, paid_at, amount_billed,
    tax_total, shipping_total, rush_order_cost, other_fee_total, raw_payload
  ) values (
    md5('onward-demo-excluded-blanks')::uuid,
    demo_import_id, 'DEMO-EXCLUDED-BLANKS', md5('onward-demo-account-1')::uuid,
    '27457826', 'Onward Blanks', 'Internet Order', 'Paid in full',
    '2026-06-15 15:00:00-04', '2026-06-15 15:00:00-04',
    10020, 10, 5, 2, 3, '{"demo":true,"expected_qualifying_spend":0}'::jsonb
  );

  -- An unpaid order must contribute zero qualifying spend.
  insert into public.orders (
    id, import_run_id, external_order_number, account_id, site_id, site_name,
    order_type, status, ordered_at, amount_billed,
    tax_total, shipping_total, rush_order_cost, other_fee_total, raw_payload
  ) values (
    md5('onward-demo-excluded-unpaid')::uuid,
    demo_import_id, 'DEMO-EXCLUDED-UNPAID', md5('onward-demo-account-2')::uuid,
    '22643266', 'OnwardCustoms', 'Business Hub Order', 'Balance outstanding',
    '2026-06-20 15:00:00-04', 10020, 10, 5, 2, 3,
    '{"demo":true,"expected_qualifying_spend":0}'::jsonb
  );

  insert into public.reward_ledger (account_id, reward_type, amount, description, expires_at)
  values
    (md5('onward-demo-account-11')::uuid, 'referral_credit_usd', 50, 'Fictional completed referral', '2027-12-31 23:59:59-05'),
    (md5('onward-demo-account-11')::uuid, 'referral_credit_usd', -15, 'Fictional credit redemption', null),
    (md5('onward-demo-account-4')::uuid, 'promotional_credit_usd', 25, 'Fictional promotional adjustment', '2026-12-31 23:59:59-05');

  insert into public.benefit_usage (account_id, benefit_id, quantity, usage_year, description, used_at)
  values
    (md5('onward-demo-account-11')::uuid, 'bronze_artwork_hours', 0.5, 2026, 'Fictional artwork assistance', '2026-07-08 15:00:00-04'),
    (md5('onward-demo-account-4')::uuid, 'silver_site_visit', 1, 2026, 'Fictional site visit', '2026-05-14 15:00:00-04');

  perform public.rebuild_tier_achievements();
end;
$$;
