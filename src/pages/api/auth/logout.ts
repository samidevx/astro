import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  const kv = (env as any)?.STORE_KV;
  const cookieHeader = request.headers.get('cookie') || '';
  let sessionToken = '';
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === 'admin_token') { sessionToken = v.join('='); break; }
  }
  if (sessionToken && kv) {
    await kv.delete(`session:${sessionToken}`);
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': `admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` }
  });
};
