import type { MiddlewareHandler } from 'astro';
import { env as cfEnv } from 'cloudflare:workers';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  // Pass through: non-admin routes, API auth routes, and the login page itself
  if (!pathname.startsWith('/admin')) return next();
  if (pathname.startsWith('/api/')) return next();
  if (pathname === '/admin/login' || pathname === '/admin/login/') return next();

  // Protected admin routes — validate session
  const kv = (cfEnv as any)?.STORE_KV;

  // Parse cookies
  const cookieHeader = context.request.headers.get('cookie') || '';
  let sessionToken = '';
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === 'admin_token') { sessionToken = v.join('='); break; }
  }

  if (!sessionToken) {
    return context.redirect('/admin/login');
  }

  // If KV is unavailable, redirect to login for safety
  if (!kv) {
    return context.redirect('/admin/login');
  }

  try {
    const session = await kv.get(`session:${sessionToken}`, 'json') as { expires_at: number } | null;
    if (!session || Date.now() > session.expires_at) {
      return context.redirect('/admin/login');
    }
  } catch {
    return context.redirect('/admin/login');
  }

  return next();
};
