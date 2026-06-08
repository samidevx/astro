import type { APIRoute } from 'astro';

const KV_KEY = 'orders:all';

const getOrders = async (kv: any) => {
  const stored = await kv.get(KV_KEY, 'json');
  return stored ?? [];
};

const saveOrders = async (kv: any, orders: any[]) => {
  await kv.put(KV_KEY, JSON.stringify(orders));
};

// GET - Fetch all orders (admin use)
export const GET: APIRoute = async ({ locals }) => {
  const kv = (locals.runtime?.env as any)?.STORE_KV;
  if (!kv) return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });

  const orders = await getOrders(kv);
  return new Response(JSON.stringify(orders), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};

// POST - Write an order to KV (dual-write alongside Google Sheets)
export const POST: APIRoute = async ({ request, locals }) => {
  const kv = (locals.runtime?.env as any)?.STORE_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });

  const body = await request.json() as any;

  if (!body.order_id || !body.nom || !body.produit) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const order = {
    ...body,
    savedAt: new Date().toISOString(),
  };

  const orders = await getOrders(kv);
  // Prevent duplicate order IDs
  const exists = orders.some((o: any) => o.order_id === order.order_id);
  if (!exists) {
    orders.unshift(order); // newest first
    await saveOrders(kv, orders);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};
