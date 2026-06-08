import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import defaultProducts from '../../../data/products.json';

const KV_KEY = 'products:all';
const getKv = () => (env as any)?.STORE_KV;
const getProducts = async () => { const kv = getKv(); const s = await kv?.get(KV_KEY, 'json'); return s ?? defaultProducts; };
const saveProducts = async (products: any[]) => { const kv = getKv(); await kv?.put(KV_KEY, JSON.stringify(products)); };

export const PUT: APIRoute = async ({ params, request }) => {
  if (!getKv()) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  const { id } = params;
  const updates = await request.json() as any;
  const products = await getProducts();
  const index = products.findIndex((p: any) => p.id === id);
  if (index === -1) return new Response(JSON.stringify({ error: `Product "${id}" not found` }), { status: 404 });
  products[index] = { ...products[index], ...updates, id, updatedAt: new Date().toISOString() };
  await saveProducts(products);
  return new Response(JSON.stringify({ success: true, product: products[index] }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params }) => {
  if (!getKv()) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  const { id } = params;
  const products = await getProducts();
  const filtered = products.filter((p: any) => p.id !== id);
  if (filtered.length === products.length) return new Response(JSON.stringify({ error: `Product "${id}" not found` }), { status: 404 });
  await saveProducts(filtered);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
