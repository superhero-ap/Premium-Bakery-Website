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
  order_id uuid := gen_random_uuid();
  order_no text := 'BF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  subtotal numeric := 0;
  line_total numeric;
  delivery_fee numeric := 0;
  total numeric;
  customer_name text := trim(payload->>'customerName');
  customer_phone text := regexp_replace(payload->>'customerPhone', '\\D', '', 'g');
  order_type text := payload->>'orderType';
begin
  if length(customer_name) < 2 then raise exception 'Invalid customer name'; end if;
  if customer_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Invalid Indian mobile number'; end if;
  if order_type not in ('pickup','delivery') then raise exception 'Invalid order type'; end if;
  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then raise exception 'Order must contain items'; end if;

  for item in select * from jsonb_array_elements(payload->'items') loop
    if coalesce((item->>'quantity')::int, 0) < 1 or coalesce((item->>'quantity')::int, 0) > 50 then raise exception 'Invalid quantity'; end if;
    select id, name, base_price into product_row from public.products where id = (item->>'productId')::uuid and is_active and is_available;
    if not found then raise exception 'Product unavailable'; end if;
    line_total := product_row.base_price * (item->>'quantity')::int;
    if item ? 'variantId' and nullif(item->>'variantId','') is not null then
      select id, name, price into variant_row from public.product_variants where id=(item->>'variantId')::uuid and product_id=product_row.id and available;
      if not found then raise exception 'Variant unavailable'; end if;
      line_total := variant_row.price * (item->>'quantity')::int;
    end if;
    subtotal := subtotal + line_total;
  end loop;

  select coalesce(delivery_charge,0) into delivery_fee from public.business_settings limit 1;
  if order_type = 'pickup' then delivery_fee := 0; end if;
  if order_type = 'delivery' and not exists(select 1 from public.business_settings where delivery_enabled=true) then raise exception 'Delivery is not currently available'; end if;
  if order_type = 'delivery' and length(trim(coalesce(payload->>'deliveryAddress',''))) < 5 then raise exception 'Delivery address is required'; end if;

  total := subtotal + delivery_fee;
  insert into public.orders(id, order_number, customer_name, customer_phone, customer_email, order_type, delivery_address, landmark, city, postal_code, scheduled_date, scheduled_time, subtotal, discount_amount, delivery_fee, total_amount, status, payment_status, customer_note)
  values(order_id, order_no, customer_name, customer_phone, nullif(trim(payload->>'customerEmail'),''), order_type, nullif(trim(payload->>'deliveryAddress'),''), nullif(trim(payload->>'landmark'),''), nullif(trim(payload->>'city'),''), nullif(trim(payload->>'postalCode'),''), nullif(payload->>'scheduledDate','')::date, nullif(payload->>'scheduledTime','')::time, subtotal, 0, delivery_fee, total, 'awaiting_confirmation', 'unpaid', nullif(trim(payload->>'customerNote'),''));

  for item in select * from jsonb_array_elements(payload->'items') loop
    select id, name, base_price into product_row from public.products where id=(item->>'productId')::uuid;
    variant_row := null;
    if item ? 'variantId' and nullif(item->>'variantId','') is not null then select id,name,price into variant_row from public.product_variants where id=(item->>'variantId')::uuid;
    end if;
    insert into public.order_items(order_id, product_id, product_name_snapshot, variant_name_snapshot, quantity, unit_price, line_total)
    values(order_id, product_row.id, product_row.name, variant_row.name, (item->>'quantity')::int, coalesce(variant_row.price, product_row.base_price), coalesce(variant_row.price, product_row.base_price) * (item->>'quantity')::int);
  end loop;
  return jsonb_build_object('order_id', order_id, 'order_number', order_no, 'subtotal', subtotal, 'discount_amount', 0, 'delivery_fee', delivery_fee, 'total_amount', total);
exception when others then
  raise;
end;
$$;

revoke all on function public.create_order_request(jsonb) from public;
grant execute on function public.create_order_request(jsonb) to anon, authenticated;
