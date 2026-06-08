import type { APIRoute } from 'astro';
import defaultProducts from '../../../data/products.json';

const KV_KEY = 'products:all';

const getProducts = async (kv: any) => {
  const stored = await kv.get(KV_KEY, 'json');
  return stored ?? defaultProducts;
};

const saveProducts = async (kv: any, products: any[]) => {
  await kv.put(KV_KEY, JSON.stringify(products));
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const kv = (locals.runtime?.env as any)?.STORE_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });

  const { id } = params;
  const updates = await request.json() as any;

  const products = await getProducts(kv);
  const index = products.findIndex((p: any) => p.id === id);

  if (index === -1) {
    return new Response(JSON.stringify({ error: `Product "${id}" not found` }), { status: 404 });
  }

  products[index] = { ...products[index], ...updates, id, updatedAt: new Date().toISOString() };
  await saveProducts(kv, products);

  return new Response(JSON.stringify({ success: true, product: products[index] }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const kv = (locals.runtime?.env as any)?.STORE_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });

  const { id } = params;
  const products = await getProducts(kv);
  const filtered = products.filter((p: any) => p.id !== id);

  if (filtered.length === products.length) {
    return new Response(JSON.stringify({ error: `Product "${id}" not found` }), { status: 404 });
  }

  await saveProducts(kv, filtered);
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
