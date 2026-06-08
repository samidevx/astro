import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import defaultProducts from '../../data/products.json';

export const POST: APIRoute = async () => {
  const kv = (env as any)?.STORE_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  const existing = await kv.get('products:all', 'json');
  if (existing) return new Response(JSON.stringify({ message: 'Already seeded', count: (existing as any[]).length }), { headers: { 'Content-Type': 'application/json' } });
  await kv.put('products:all', JSON.stringify(defaultProducts));
  return new Response(JSON.stringify({ success: true, seeded: defaultProducts.length }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
