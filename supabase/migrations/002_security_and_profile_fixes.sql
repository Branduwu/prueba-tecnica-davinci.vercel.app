-- Aplicar también en proyectos que ya ejecutaron 001_initial_schema.sql.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'cashier')
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.complete_sale(p_items jsonb, p_amount_received numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_sale uuid := gen_random_uuid(); v_subtotal numeric := 0; v_total numeric; v_item jsonb; v_product public.products%rowtype; v_qty numeric; v_line numeric;
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'El carrito está vacío'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and active for update;
    if not found then raise exception 'Producto no disponible'; end if;
    if v_qty <= 0 or v_qty > v_product.stock then raise exception 'Stock insuficiente para %', v_product.name; end if;
    if v_product.unit <> 'kg' and trunc(v_qty) <> v_qty then raise exception 'La cantidad de % debe ser entera', v_product.name; end if;
    v_line := round(v_product.price * v_qty, 2); v_subtotal := v_subtotal + v_line;
  end loop;
  v_total := round(v_subtotal, 2);
  if p_amount_received < v_total then raise exception 'El efectivo recibido es insuficiente'; end if;
  insert into public.sales(id,cashier_id,subtotal,total,amount_received,change_amount) values(v_sale,v_user,v_total,v_total,p_amount_received,round(p_amount_received-v_total,2));
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric; select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update;
    v_line := round(v_product.price*v_qty,2);
    insert into public.sale_items(sale_id,product_id,quantity,unit_price,subtotal) values(v_sale,v_product.id,v_qty,v_product.price,v_line);
    update public.products set stock=stock-v_qty,updated_at=now() where id=v_product.id;
    insert into public.inventory_movements(product_id,movement_type,quantity,previous_stock,new_stock,reason,sale_id,user_id) values(v_product.id,'sale',-v_qty,v_product.stock,v_product.stock-v_qty,'Venta POS',v_sale,v_user);
  end loop;
  return jsonb_build_object('sale_id',v_sale,'subtotal',v_total,'total',v_total,'change_amount',round(p_amount_received-v_total,2));
end; $$;
