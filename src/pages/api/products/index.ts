import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import defaultProducts from '../../../data/products.json';

const KV_KEY = 'products:all';
const getKv = () => (env as any)?.STORE_KV;
const getProducts = async () => { const kv = getKv(); const s = await kv?.get(KV_KEY, 'json'); return s ?? defaultProducts; };
const saveProducts = async (products: any[]) => { const kv = getKv(); await kv?.put(KV_KEY, JSON.stringify(products)); };

export const GET: APIRoute = async () => {
  const products = await getProducts();
  return new Response(JSON.stringify(products), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!getKv()) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  const product = await request.json() as any;
  if (!product.id || !product.title || !product.price)
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  const products = await getProducts();
  if (products.find((p: any) => p.id === product.id))
    return new Response(JSON.stringify({ error: `Product "${product.id}" already exists` }), { status: 409 });
  products.push({ ...product, createdAt: new Date().toISOString() });
  await saveProducts(products);
  return new Response(JSON.stringify({ success: true, product }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
