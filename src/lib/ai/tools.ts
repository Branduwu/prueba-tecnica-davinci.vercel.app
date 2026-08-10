import { createAdminClient } from '@/lib/supabase/admin'
const money=(n:number)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0)
const start=(period:'today'|'week'|'month')=>period==='today'?new Date().toISOString().slice(0,10):period==='week'?new Date(Date.now()-6*864e5).toISOString():new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString()
const noData='No encontré datos para esa consulta.'
export async function answerBusinessQuestion(question:string){
 const q=question.toLowerCase(),db=createAdminClient()
 if(/poco|bajo/.test(q)){const {data,error}=await db.from('products').select('name,stock,unit').filter('stock','lte','low_stock_threshold');if(error)return noData;return data?.length?`Inventario bajo: ${data.map(x=>`${x.name} (${x.stock} ${x.unit})`).join(', ')}.`:'No hay productos con stock bajo.'}
 if(/stock|inventario/.test(q)){const words=q.replace(/cuánto|cuanto|stock|queda|de|el|la|hay|\?/g,' ').trim();const {data,error}=await db.from('products').select('name,stock,unit').ilike('name',`%${words}%`).limit(1);return !error&&data?.[0]?`${data[0].name}: ${data[0].stock} ${data[0].unit} disponibles.`:noData}
 const period=/hoy/.test(q)?'today':/semana/.test(q)?'week':'month'
 if(/gast/.test(q)){const {data,error}=await db.from('expenses').select('amount').gte('expense_date',start(period));if(error||!data?.length)return noData;return `Gastos del periodo: ${money(data.reduce((a,x)=>a+Number(x.amount),0))}.`}
 const {data:sales,error:salesError}=await db.from('sales').select('id,total').gte('created_at',start(period));if(salesError)return noData
 const income=(sales??[]).reduce((a,x)=>a+Number(x.total),0)
 if(/más vendido|mas vendido|producto.*vend/.test(q)){const ids=(sales??[]).map(x=>x.id);if(!ids.length)return noData;const {data:items,error}=await db.from('sale_items').select('quantity,subtotal,product:products(name)').in('sale_id',ids);if(error||!items?.length)return noData;const grouped=new Map<string,{quantity:number;income:number}>();for(const item of items){const name=(item.product as unknown as {name:string}|null)?.name;if(!name)continue;const row=grouped.get(name)??{quantity:0,income:0};row.quantity+=Number(item.quantity);row.income+=Number(item.subtotal);grouped.set(name,row)}const top=[...grouped.entries()].sort((a,b)=>b[1].quantity-a[1].quantity)[0];return top?`El producto más vendido es ${top[0]}: ${top[1].quantity} unidades y ${money(top[1].income)}.`:noData}
 if(/flujo/.test(q)){const {data,error}=await db.from('expenses').select('amount').gte('expense_date',start(period));if(error)return noData;if(!sales?.length&&!data?.length)return noData;return `Flujo de caja del periodo: ${money(income-(data??[]).reduce((a,x)=>a+Number(x.amount),0))}.`}
 if(/vend|venta|ingreso/.test(q))return sales?.length?`Ventas del periodo: ${money(income)}.`:noData
 return 'Puedo consultar ventas, stock, inventario bajo, productos más vendidos, gastos y flujo de caja. Indica el periodo o producto.'
}
