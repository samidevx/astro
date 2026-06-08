import type { APIRoute } from 'astro';
import defaultProducts from '../../data/products.json';

// One-time endpoint to seed products.json into Cloudflare KV
// Call it once via: POST /api/seed
export const POST: APIRoute = async ({ locals }) => {
  const kv = (locals.runtime?.env as any)?.STORE_KV;
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });
  }

  const existing = await kv.get('products:all', 'json');
  if (existing) {
    return new Response(JSON.stringify({ message: 'Products already seeded. Delete KV key to re-seed.', count: (existing as any[]).length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await kv.put('products:all', JSON.stringify(defaultProducts));

  return new Response(JSON.stringify({ success: true, seeded: defaultProducts.length }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};
