import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const KV_KEY = 'orders:all';
const getKv = () => (env as any)?.STORE_KV;
const getOrders = async () => { const kv = getKv(); return (await kv?.get(KV_KEY, 'json')) ?? []; };
const saveOrders = async (orders: any[]) => { const kv = getKv(); await kv?.put(KV_KEY, JSON.stringify(orders)); };

export const PUT: APIRoute = async ({ params, request }) => {
  const kv = getKv();
  if (!kv) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing order ID' }), { status: 400 });
  const body = await request.json() as any;
  const orders = await getOrders();
  const index = orders.findIndex((o: any) => o.order_id === id || String(o.id) === id);
  if (index === -1) return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });

  orders[index] = { ...orders[index], ...body, updatedAt: new Date().toISOString() };
  await saveOrders(orders);
  return new Response(JSON.stringify({ success: true, order: orders[index] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  const kv = getKv();
  if (!kv) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing order ID' }), { status: 400 });
  const orders = await getOrders();
  const filtered = orders.filter((o: any) => o.order_id !== id && String(o.id) !== id);
  await saveOrders(filtered);
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
