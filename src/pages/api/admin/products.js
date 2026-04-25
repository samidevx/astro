export const prerender = false;

export async function POST({ request, locals }) {
  try {
    const products = await request.json();
    const kv = locals.runtime?.env?.PRODUCTS_KV;
    
    if (!kv) {
      return new Response(JSON.stringify({ error: 'KV namespace PRODUCTS_KV not found' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    await kv.put('all_products', JSON.stringify(products));
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
