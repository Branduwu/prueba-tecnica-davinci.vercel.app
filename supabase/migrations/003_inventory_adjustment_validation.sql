create or replace function public.adjust_inventory(p_product_id uuid, p_quantity numeric, p_type public.inventory_movement_type, p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare p public.products%rowtype; v_new numeric;
begin
 if not public.is_admin() then raise exception 'No autorizado'; end if;
 if p_quantity is null or p_quantity <= 0 then raise exception 'La cantidad debe ser mayor a cero'; end if;
 if p_type not in ('entry','exit') then raise exception 'Tipo de movimiento inválido'; end if;
 if coalesce(trim(p_reason),'') = '' then raise exception 'El motivo es obligatorio'; end if;
 select * into p from public.products where id=p_product_id for update; if not found then raise exception 'Producto no encontrado'; end if;
 if p.unit <> 'kg' and trunc(p_quantity) <> p_quantity then raise exception 'La cantidad debe ser entera para %', p.name; end if;
 v_new := case when p_type='entry' then p.stock+p_quantity else p.stock-p_quantity end;
 if v_new<0 then raise exception 'El ajuste deja el stock negativo'; end if;
 update public.products set stock=v_new,updated_at=now() where id=p.id;
 insert into public.inventory_movements(product_id,movement_type,quantity,previous_stock,new_stock,reason,user_id) values(p.id,p_type,case when p_type='exit' then -p_quantity else p_quantity end,p.stock,v_new,p_reason,auth.uid());
end; $$;
