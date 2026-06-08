import type { MiddlewareHandler } from 'astro';

const PROTECTED_PATHS = ['/admin', '/admin/'];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;
  const { request, locals } = context;

  // Only protect /admin/* routes (not /api/auth/login)
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthApi = pathname.startsWith('/api/auth');

  if (!isAdminRoute || isAuthApi) {
    return next();
  }

  // Login page itself doesn't need protection
  if (pathname === '/admin/login') {
    return next();
  }

  const kv = (locals.runtime?.env as any)?.STORE_KV;

  // Read session cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const sessionToken = cookies['admin_token'];

  if (!sessionToken || !kv) {
    // No token → redirect to login
    return context.redirect('/admin/login');
  }

  // Validate token against KV
  try {
    const sessionData = await kv.get(`session:${sessionToken}`, 'json') as { expires_at: number } | null;
    if (!sessionData || Date.now() > sessionData.expires_at) {
      // Expired or invalid
      return context.redirect('/admin/login');
    }
  } catch {
    return context.redirect('/admin/login');
  }

  return next();
};
