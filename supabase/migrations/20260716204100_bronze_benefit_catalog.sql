insert into public.benefit_definitions(id,name,unit,tier_id,annual_allowance,reseller_only,stackable) values
 ('bronze_logo_edits','Simple logo edits','available','bronze',null,false,false),
 ('bronze_rush_savings','Rush-order savings','10% off','bronze',null,false,false),
 ('bronze_webstore','Webstore creation','50% off','bronze',null,false,false),
 ('bronze_payment_terms','Flexible payment terms','available','bronze',null,false,false),
 ('bronze_customer_garments','Your own garments','available','bronze',null,false,false)
on conflict(id) do update set name=excluded.name,unit=excluded.unit,tier_id=excluded.tier_id,annual_allowance=excluded.annual_allowance,active=true;
