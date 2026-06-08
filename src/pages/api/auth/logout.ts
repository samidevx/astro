import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const kv = (locals.runtime?.env as any)?.STORE_KV;

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const sessionToken = cookies['admin_token'];

  if (sessionToken && kv) {
    await kv.delete(`session:${sessionToken}`);
  }

  const expiredCookie = `admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': expiredCookie,
    }
  });
};
