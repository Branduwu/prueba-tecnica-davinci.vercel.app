export type Role = 'admin' | 'cashier'
export type Product = { id:string; sku:string; name:string; category:string; unit:'pieza'|'paquete'|'manojo'|'kg'; price:number; stock:number; low_stock_threshold:number; active:boolean }
export type CartItem = Product & { quantity:number }
