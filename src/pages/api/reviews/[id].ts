import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const KV_KEY = 'reviews:all';
const getKv = () => (env as any)?.STORE_KV;

const getReviews = async (): Promise<any[]> => {
  const kv = getKv();
  if (!kv) return [];
  const stored = await kv.get(KV_KEY, 'json');
  return (Array.isArray(stored) ? stored : []) as any[];
};

const saveReviews = async (reviews: any[]) => {
  const kv = getKv();
  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(reviews));
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing review ID' }), { status: 400 });

  const body = await request.json() as any;
  const reviews = await getReviews();
  const index = reviews.findIndex((r: any) => r.id === id);

  if (index === -1) {
    return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
  }

  reviews[index] = {
    ...reviews[index],
    ...body,
    updatedAt: new Date().toISOString()
  };

  await saveReviews(reviews);
  return new Response(JSON.stringify({ success: true, review: reviews[index] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Missing review ID' }), { status: 400 });

  const reviews = await getReviews();
  const filtered = reviews.filter((r: any) => r.id !== id);
  await saveReviews(filtered);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
