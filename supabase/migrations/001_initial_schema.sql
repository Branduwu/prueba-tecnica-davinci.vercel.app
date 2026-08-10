create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'cashier');
create type public.inventory_movement_type as enum ('entry', 'exit', 'adjustment', 'sale');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'cashier',
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(), sku text not null unique,
  name text not null, category text not null, unit text not null check (unit in ('pieza','paquete','manojo','kg')),
  price numeric(12,3) not null check (price >= 0), stock numeric(12,3) not null default 0 check (stock >= 0),
  low_stock_threshold numeric(12,3) not null default 0 check (low_stock_threshold >= 0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sales (
  id uuid primary key default gen_random_uuid(), cashier_id uuid not null references public.profiles(id),
  subtotal numeric(12,2) not null, total numeric(12,2) not null, amount_received numeric(12,2) not null,
  change_amount numeric(12,2) not null, created_at timestamptz not null default now()
);
create table public.sale_items (
  id uuid primary key default gen_random_uuid(), sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id), quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,3) not null, subtotal numeric(12,2) not null
);
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
  movement_type public.inventory_movement_type not null, quantity numeric(12,3) not null,
  previous_stock numeric(12,3) not null, new_stock numeric(12,3) not null, reason text not null,
  sale_id uuid references public.sales(id), user_id uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), category text not null, description text not null,
  amount numeric(12,2) not null check (amount > 0), expense_date date not null, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'cashier');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create index products_search_idx on public.products using gin (to_tsvector('spanish', name || ' ' || sku));
create index sales_created_idx on public.sales(created_at); create index movements_product_idx on public.inventory_movements(product_id, created_at desc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.complete_sale(p_items jsonb, p_amount_received numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_sale uuid := gen_random_uuid(); v_subtotal numeric := 0; v_total numeric; v_item jsonb; v_product public.products%rowtype; v_product_id uuid; v_qty numeric; v_line numeric; v_requested jsonb := '{}'::jsonb;
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'El carrito está vacío'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    v_product_id := (v_item->>'product_id')::uuid;
    v_requested := jsonb_set(v_requested, array[v_product_id::text], to_jsonb(coalesce((v_requested->>v_product_id::text)::numeric, 0) + v_qty));
    select * into v_product from public.products where id = v_product_id and active for update;
    if not found then raise exception 'Producto no disponible'; end if;
    if v_qty <= 0 or (v_requested->>v_product_id::text)::numeric > v_product.stock then raise exception 'Stock insuficiente para %', v_product.name; end if;
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

alter table public.profiles enable row level security; alter table public.products enable row level security; alter table public.sales enable row level security; alter table public.sale_items enable row level security; alter table public.inventory_movements enable row level security; alter table public.expenses enable row level security;
create policy "profile own" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "products read" on public.products for select to authenticated using (true);
create policy "products admin write" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "sales own or admin" on public.sales for select to authenticated using (cashier_id=auth.uid() or public.is_admin());
create policy "items own sale" on public.sale_items for select to authenticated using (exists(select 1 from public.sales s where s.id=sale_id and (s.cashier_id=auth.uid() or public.is_admin())));
create policy "moves read" on public.inventory_movements for select to authenticated using (true);
create policy "expenses admin" on public.expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant usage on schema public to authenticated, service_role;
grant select on public.profiles, public.products, public.sales, public.sale_items, public.inventory_movements, public.expenses to authenticated;
grant insert, update, delete on public.products, public.expenses to authenticated;
grant all privileges on all tables in schema public to service_role;
grant execute on function public.complete_sale(jsonb,numeric) to authenticated;

create or replace function public.adjust_inventory(p_product_id uuid, p_quantity numeric, p_type public.inventory_movement_type, p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare p public.products%rowtype; v_new numeric;
begin
 if not public.is_admin() then raise exception 'No autorizado'; end if;
 select * into p from public.products where id=p_product_id for update; if not found then raise exception 'Producto no encontrado'; end if;
 v_new := case when p_type='entry' then p.stock+p_quantity when p_type='exit' then p.stock-p_quantity else p_quantity end;
 if v_new<0 then raise exception 'El ajuste deja el stock negativo'; end if;
 update public.products set stock=v_new,updated_at=now() where id=p.id;
 insert into public.inventory_movements(product_id,movement_type,quantity,previous_stock,new_stock,reason,user_id) values(p.id,p_type,case when p_type='exit' then -p_quantity else p_quantity end,p.stock,v_new,p_reason,auth.uid());
end; $$;
grant execute on function public.adjust_inventory(uuid,numeric,public.inventory_movement_type,text) to authenticated;
