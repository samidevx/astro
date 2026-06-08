import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals.runtime?.env as any);
  const kv = env?.STORE_KV;

  const body = await request.json() as { password: string };
  const adminPassword = env?.ADMIN_PASSWORD || 'admin123';

  if (!body.password || body.password !== adminPassword) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate secure session token
  const token = crypto.randomUUID();
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const sessionData = {
    created_at: Date.now(),
    expires_at: Date.now() + SESSION_TTL_MS,
  };

  if (kv) {
    await kv.put(`session:${token}`, JSON.stringify(sessionData), {
      expirationTtl: Math.floor(SESSION_TTL_MS / 1000)
    });
  }

  // Set HttpOnly cookie
  const cookie = [
    `admin_token=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    // `Secure`, // Uncomment when on HTTPS (production)
  ].join('; ');

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    }
  });
};
