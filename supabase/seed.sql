-- Ejecuta después de crear los dos usuarios en Authentication. Sustituye los UUID.
-- update public.profiles set full_name='Administrador Demo', role='admin' where id='UUID_ADMIN';
-- update public.profiles set full_name='Cajero Demo', role='cashier' where id='UUID_CAJERO';
insert into public.products(sku,name,category,unit,price,stock,low_stock_threshold) values
('FV-001','Tomate saladet','Frutas y Verduras','kg',28.500,120,10),
('AB-001','Arroz 1 kg','Abarrotes','paquete',32.000,48,8),
('LA-001','Leche entera 1 L','Lácteos y Huevo','pieza',26.500,60,12),
('CA-001','Carne molida','Carnes y Pescados','kg',175.000,25,5)
on conflict (sku) do update set name=excluded.name,category=excluded.category,unit=excluded.unit,price=excluded.price,stock=excluded.stock;
