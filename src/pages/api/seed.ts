import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import defaultProducts from '../../data/products.json';

export const POST: APIRoute = async () => {
  const kv = (env as any)?.STORE_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 });

  const existingProducts = await kv.get('products:all', 'json');
  if (!existingProducts || !(existingProducts as any[]).length) {
    await kv.put('products:all', JSON.stringify(defaultProducts));
  }

  const existingOrders = await kv.get('orders:all', 'json');
  let seededOrdersCount = 0;

  if (!existingOrders || !(existingOrders as any[]).length) {
    const now = Date.now();
    const d = (daysAgo: number, hoursAgo: number = 0) => new Date(now - (daysAgo * 86400000) - (hoursAgo * 3600000)).toISOString();

    const sampleOrders = [
      // Product 1: Kiné-sciatique (Campaign: tiktok_viral_kine - Ad: video_hook_ugc1)
      {
        order_id: 'ASTRO-10001',
        nom: 'Amadou Koné',
        telephone: '+225 07 12 34 56',
        pays: 'CI',
        adresse: 'Cocody, Abidjan',
        produit: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
        code: 'COD05813',
        quantity: 1,
        total: 19900,
        prix: '19.900 CFA',
        status: 'COMPLETED',
        utm_source: 'tiktok',
        utm_medium: 'cpc',
        utm_campaign: 'tiktok_viral_kine',
        utm_content: 'video_hook_ugc1',
        date: d(1, 2),
      },
      {
        order_id: 'ASTRO-10002',
        nom: 'Fatou Traoré',
        telephone: '+225 05 98 76 54',
        pays: 'CI',
        adresse: 'Yopougon, Abidjan',
        produit: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
        code: 'COD05813',
        quantity: 2,
        total: 35000,
        prix: '35.000 CFA',
        status: 'COMPLETED',
        utm_source: 'tiktok',
        utm_medium: 'cpc',
        utm_campaign: 'tiktok_viral_kine',
        utm_content: 'video_hook_ugc1',
        date: d(2, 4),
      },
      {
        order_id: 'ASTRO-10003',
        nom: 'Koffi Serge',
        telephone: '+225 01 23 45 67',
        pays: 'CI',
        adresse: 'Marcory, Abidjan',
        produit: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
        code: 'COD05813',
        quantity: 1,
        total: 19900,
        prix: '19.900 CFA',
        status: 'COMPLETED',
        utm_source: 'tiktok',
        utm_medium: 'cpc',
        utm_campaign: 'tiktok_viral_kine',
        utm_content: 'video_hook_ugc1',
        date: d(0, 3),
      },
      // Product 1: Kiné-sciatique (Campaign: fb_sciatique_retargeting - Ad: ad_testimonial_dr)
      {
        order_id: 'ASTRO-10004',
        nom: 'Moussa Diarra',
        telephone: '+223 76 54 32 10',
        pays: 'ML',
        adresse: 'Bamako Coura',
        produit: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
        code: 'COD05813',
        quantity: 1,
        total: 19900,
        prix: '19.900 CFA',
        status: 'COMPLETED',
        utm_source: 'facebook',
        utm_medium: 'paid',
        utm_campaign: 'fb_sciatique_retargeting',
        utm_content: 'ad_testimonial_dr',
        date: d(3, 1),
      },
      {
        order_id: 'ASTRO-10005',
        nom: 'Ousmane Sangaré',
        telephone: '+226 70 11 22 33',
        pays: 'BF',
        adresse: 'Ouagadougou',
        produit: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
        code: 'COD05813',
        quantity: 1,
        total: 19900,
        prix: '19.900 CFA',
        status: 'COMPLETED',
        utm_source: 'facebook',
        utm_medium: 'paid',
        utm_campaign: 'fb_sciatique_retargeting',
        utm_content: 'ad_testimonial_dr',
        date: d(4, 5),
      },
      // Product 1: Kiné-sciatique (Campaign: tiktok_viral_kine - Ad: video_hook_ugc2)
      {
        order_id: 'ASTRO-10006',
        nom: 'Aïcha Diallo',
        telephone: '+221 77 123 45 67',
        pays: 'SN',
        adresse: 'Dakar Plateau',
        produit: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
        code: 'COD05813',
        quantity: 1,
        total: 19900,
        prix: '19.900 CFA',
        status: 'COMPLETED',
        utm_source: 'tiktok',
        utm_medium: 'cpc',
        utm_campaign: 'tiktok_viral_kine',
        utm_content: 'video_hook_ugc2',
        date: d(1, 6),
      },
      // Product 1: Kiné-sciatique Abandoned
      {
        order_id: 'ASTRO-10007',
        nom: 'Ibrahim Touré',
        telephone: '+225 07 44 55 66',
        pays: 'CI',
        adresse: 'Bouaké',
        produit: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
        code: 'COD05813',
        quantity: 1,
        total: 19900,
        prix: '19.900 CFA',
        status: 'ABANDONED',
        utm_source: 'tiktok',
        utm_medium: 'cpc',
        utm_campaign: 'tiktok_viral_kine',
        utm_content: 'video_hook_ugc1',
        date: d(0, 1),
      },
      // Product 2: Alphabook (Campaign: fb_parents_alphabook - Ad: carousel_demonstration)
      {
        order_id: 'ASTRO-20001',
        nom: 'Clarisse Gbagbo',
        telephone: '+229 97 00 11 22',
        pays: 'BJ',
        adresse: 'Cotonou Cadjehoun',
        produit: "Alphabook™ ORIGINAL - 4 Cahiers d’écriture réutilisables",
        code: 'COD18461',
        quantity: 2,
        total: 35800,
        prix: '35.800 CFA',
        status: 'COMPLETED',
        utm_source: 'facebook',
        utm_medium: 'paid',
        utm_campaign: 'fb_parents_alphabook',
        utm_content: 'carousel_demonstration',
        date: d(1, 1),
      },
      {
        order_id: 'ASTRO-20002',
        nom: 'Benoit N’Guessan',
        telephone: '+228 90 22 33 44',
        pays: 'TG',
        adresse: 'Lomé Centre',
        produit: "Alphabook™ ORIGINAL - 4 Cahiers d’écriture réutilisables",
        code: 'COD18461',
        quantity: 1,
        total: 17900,
        prix: '17.900 CFA',
        status: 'COMPLETED',
        utm_source: 'facebook',
        utm_medium: 'paid',
        utm_campaign: 'fb_parents_alphabook',
        utm_content: 'carousel_demonstration',
        date: d(2, 3),
      },
      {
        order_id: 'ASTRO-20003',
        nom: 'Edwige Bamba',
        telephone: '+241 01 23 45 67',
        pays: 'GA',
        adresse: 'Libreville Mont-Bouet',
        produit: "Alphabook™ ORIGINAL - 4 Cahiers d’écriture réutilisables",
        code: 'COD18461',
        quantity: 3,
        total: 53700,
        prix: '53.700 CFA',
        status: 'COMPLETED',
        utm_source: 'facebook',
        utm_medium: 'paid',
        utm_campaign: 'fb_parents_alphabook',
        utm_content: 'carousel_demonstration',
        date: d(0, 5),
      },
      // Product 2: Alphabook (Campaign: summer_promo_alphabook - Ad: video_kids_fun)
      {
        order_id: 'ASTRO-20004',
        nom: 'Marcelle Akouba',
        telephone: '+225 07 88 99 00',
        pays: 'CI',
        adresse: 'Deux Plateaux, Abidjan',
        produit: "Alphabook™ ORIGINAL - 4 Cahiers d’écriture réutilisables",
        code: 'COD18461',
        quantity: 1,
        total: 17900,
        prix: '17.900 CFA',
        status: 'COMPLETED',
        utm_source: 'tiktok',
        utm_medium: 'cpc',
        utm_campaign: 'summer_promo_alphabook',
        utm_content: 'video_kids_fun',
        date: d(3, 2),
      },
      // Direct Organic Order without UTM
      {
        order_id: 'ASTRO-30001',
        nom: 'Pauline Kouadio',
        telephone: '+225 01 99 88 77',
        pays: 'CI',
        adresse: 'Treichville, Abidjan',
        produit: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
        code: 'COD05813',
        quantity: 1,
        total: 19900,
        prix: '19.900 CFA',
        status: 'COMPLETED',
        utm_source: '',
        utm_campaign: '',
        utm_content: '',
        date: d(5, 2),
      }
    ];

    await kv.put('orders:all', JSON.stringify(sampleOrders));
    seededOrdersCount = sampleOrders.length;
  }

  return new Response(JSON.stringify({ success: true, seededProducts: defaultProducts.length, seededOrders: seededOrdersCount }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};
