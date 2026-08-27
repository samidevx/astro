import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import defaultSettings from '../../../data/settings.json';

const KV_KEY = 'settings:config';
const getKv = () => (env as any)?.STORE_KV;

const getSettings = async () => {
  try {
    const kv = getKv();
    const s = await kv?.get(KV_KEY, 'json');
    return s ?? defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
};

const saveSettings = async (settings: any) => {
  const kv = getKv();
  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(settings));
  }
};

export const GET: APIRoute = async () => {
  const settings = await getSettings();
  return new Response(JSON.stringify(settings), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const currentSettings = await getSettings();
    const updatedSettings = {
      ...currentSettings,
      ...body,
      updatedAt: new Date().toISOString()
    };

    await saveSettings(updatedSettings);

    return new Response(JSON.stringify({ success: true, settings: updatedSettings }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to update settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
