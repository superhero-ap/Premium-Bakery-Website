create or replace function public.create_order_request(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row record;
  variant_row record;
  offer_row record;
  order_id uuid := gen_random_uuid();
  order_no text := 'BF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  subtotal numeric := 0;
  line_total numeric;
  discount_amount numeric := 0;
  delivery_fee numeric := 0;
  total numeric;
  customer_name text := trim(payload->>'customerName');
  customer_phone text := regexp_replace(payload->>'customerPhone', '\\D', '', 'g');
  order_type text := payload->>'orderType';
  offer_id uuid := nullif(payload->>'offerId','')::uuid;
begin
  if length(customer_name) < 2 then raise exception 'Invalid customer name'; end if;
  if customer_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Invalid Indian mobile number'; end if;
  if order_type not in ('pickup','delivery') then raise exception 'Invalid order type'; end if;
  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then raise exception 'Order must contain items'; end if;

  for item in select * from jsonb_array_elements(payload->'items') loop
    if coalesce((item->>'quantity')::int, 0) < 1 or coalesce((item->>'quantity')::int, 0) > 50 then raise exception 'Invalid quantity'; end if;
    select id, name, base_price, category_id into product_row from public.products where id = (item->>'productId')::uuid and is_active and is_available;
    if not found then raise exception 'Product unavailable'; end if;
    line_total := product_row.base_price * (item->>'quantity')::int;
    if item ? 'variantId' and nullif(item->>'variantId','') is not null then
      select id, name, price into variant_row from public.product_variants where id=(item->>'variantId')::uuid and product_id=product_row.id and available;
      if not found then raise exception 'Variant unavailable'; end if;
      line_total := variant_row.price * (item->>'quantity')::int;
    end if;
    subtotal := subtotal + line_total;
  end loop;

  select coalesce(delivery_charge,0), coalesce(minimum_order,0) into delivery_fee, total from public.business_settings limit 1;
  if order_type = 'pickup' then delivery_fee := 0; end if;
  if order_type = 'delivery' and not exists(select 1 from public.business_settings where delivery_enabled=true) then raise exception 'Delivery is not currently available'; end if;
  if order_type = 'delivery' and length(trim(coalesce(payload->>'deliveryAddress',''))) < 5 then raise exception 'Delivery address is required'; end if;
  if subtotal < coalesce(total,0) then raise exception 'Order is below the minimum order value'; end if;

  if offer_id is not null then
    select id, discount_type, discount_value into offer_row from public.offers where id=offer_id and active=true and current_date between start_date and end_date;
    if not found then raise exception 'Offer is unavailable'; end if;
    if exists(select 1 from public.offer_products where offer_id=offer_row.id and product_id in (select (x->>'productId')::uuid from jsonb_array_elements(payload->'items') x))
       or exists(select 1 from public.offer_categories oc join public.products p on p.category_id=oc.category_id where oc.offer_id=offer_row.id and p.id in (select (x->>'productId')::uuid from jsonb_array_elements(payload->'items') x))
       or (not exists(select 1 from public.offer_products where offer_id=offer_row.id) and not exists(select 1 from public.offer_categories where offer_id=offer_row.id)) then
      if offer_row.discount_type='percentage' then discount_amount := round(subtotal * offer_row.discount_value / 100, 2); else discount_amount := least(subtotal, offer_row.discount_value); end if;
    else
      raise exception 'Offer does not apply to this order';
    end if;
  end if;

  total := subtotal - discount_amount + delivery_fee;
  insert into public.orders(id, order_number, customer_name, customer_phone, customer_email, order_type, delivery_address, landmark, city, postal_code, scheduled_date, scheduled_time, subtotal, discount_amount, delivery_fee, total_amount, status, payment_status, customer_note)
  values(order_id, order_no, customer_name, customer_phone, nullif(trim(payload->>'customerEmail'),''), order_type, nullif(trim(payload->>'deliveryAddress'),''), nullif(trim(payload->>'landmark'),''), nullif(trim(payload->>'city'),''), nullif(trim(payload->>'postalCode'),''), nullif(payload->>'scheduledDate','')::date, nullif(payload->>'scheduledTime','')::time, subtotal, discount_amount, delivery_fee, total, 'awaiting_confirmation', 'unpaid', nullif(trim(payload->>'customerNote'),''));

  for item in select * from jsonb_array_elements(payload->'items') loop
    select id, name, base_price into product_row from public.products where id=(item->>'productId')::uuid;
    variant_row := null;
    if item ? 'variantId' and nullif(item->>'variantId','') is not null then select id,name,price into variant_row from public.product_variants where id=(item->>'variantId')::uuid;
    end if;
    insert into public.order_items(order_id, product_id, product_name_snapshot, variant_name_snapshot, quantity, unit_price, line_total)
    values(order_id, product_row.id, product_row.name, variant_row.name, (item->>'quantity')::int, coalesce(variant_row.price, product_row.base_price), coalesce(variant_row.price, product_row.base_price) * (item->>'quantity')::int);
  end loop;
  return jsonb_build_object('order_id', order_id, 'order_number', order_no, 'subtotal', subtotal, 'discount_amount', discount_amount, 'delivery_fee', delivery_fee, 'total_amount', total);
end;
$$;

create or replace function public.create_custom_cake_request(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid := gen_random_uuid();
  customer_phone text := regexp_replace(payload->>'phone', '\\D', '', 'g');
begin
  if length(trim(payload->>'customerName')) < 2 then raise exception 'Invalid customer name'; end if;
  if customer_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Invalid Indian mobile number'; end if;
  if length(trim(payload->>'occasion')) < 2 or length(trim(payload->>'flavour')) < 2 or length(trim(payload->>'weight')) < 1 then raise exception 'Cake details are required'; end if;
  if nullif(payload->>'requiredDate','') is null or nullif(payload->>'preferredTime','') is null then raise exception 'Required date and preferred time are required'; end if;
  insert into public.custom_cake_requests(id, customer_name, phone, email, occasion, flavour, weight, theme, cake_message, colour_preference, special_instructions, reference_image_url, required_date, preferred_time)
  values(request_id, trim(payload->>'customerName'), customer_phone, nullif(trim(payload->>'email'),''), trim(payload->>'occasion'), trim(payload->>'flavour'), trim(payload->>'weight'), nullif(trim(payload->>'theme'),''), nullif(trim(payload->>'cakeMessage'),''), nullif(trim(payload->>'colourPreference'),''), nullif(trim(payload->>'specialInstructions'),''), nullif(trim(payload->>'referenceImageUrl'),''), (payload->>'requiredDate')::date, (payload->>'preferredTime')::time);
  return jsonb_build_object('request_id',request_id,'status','new');
end;
$$;

revoke all on function public.create_order_request(jsonb) from public;
grant execute on function public.create_order_request(jsonb) to anon, authenticated;
revoke all on function public.create_custom_cake_request(jsonb) from public;
grant execute on function public.create_custom_cake_request(jsonb) to anon, authenticated;
