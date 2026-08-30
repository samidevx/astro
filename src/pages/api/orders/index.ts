import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const KV_KEY = 'orders:all';
const getKv = () => (env as any)?.STORE_KV;
const getOrders = async () => { const kv = getKv(); return (await kv?.get(KV_KEY, 'json')) ?? []; };
const saveOrders = async (orders: any[]) => { const kv = getKv(); await kv?.put(KV_KEY, JSON.stringify(orders)); };

export const GET: APIRoute = async () => {
  const orders = await getOrders();
  return new Response(JSON.stringify(orders), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!getKv()) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  const body = await request.json() as any;
  if (!body.order_id || !body.nom || !body.produit)
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  const orders = await getOrders();
  const index = orders.findIndex((o: any) => o.order_id === body.order_id);
  if (index >= 0) {
    orders[index] = { ...orders[index], ...body, savedAt: new Date().toISOString() };
  } else {
    orders.unshift({ ...body, savedAt: new Date().toISOString() });
  }
  await saveOrders(orders);
  return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
