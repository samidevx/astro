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

export const GET: APIRoute = async ({ locals }) => {
  const kv = (locals.runtime?.env as any)?.STORE_KV;
  if (!kv) {
    return new Response(JSON.stringify(defaultProducts), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const products = await getProducts(kv);
  return new Response(JSON.stringify(products), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const kv = (locals.runtime?.env as any)?.STORE_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });

  const product = await request.json() as any;

  if (!product.id || !product.title || !product.price) {
    return new Response(JSON.stringify({ error: 'Missing required fields: id, title, price' }), { status: 400 });
  }

  const products = await getProducts(kv);
  const existing = products.findIndex((p: any) => p.id === product.id);

  if (existing > -1) {
    return new Response(JSON.stringify({ error: `Product with id "${product.id}" already exists. Use PUT to update.` }), { status: 409 });
  }

  products.push({ ...product, createdAt: new Date().toISOString() });
  await saveProducts(kv, products);

  return new Response(JSON.stringify({ success: true, product }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};
