import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const KV_KEY = 'reviews:all';
const getKv = () => (env as any)?.STORE_KV;

const defaultReviews = [
  {
    id: 'REV-1001',
    productId: 'kine',
    productTitle: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
    productImage: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjSi7bJcBkzia8MviCzfV_0HYzvMzKS0a6yG5z9HtK3gVeeZrjubxGpNsFZyS6COiUUT3fYKooyG2lXm8RQ9m91_pcB6JDxdJ1Uyq-hibe2FC5pAG8Dxlc0tTxLbgu0OwvFI0ndJBM4uQDiUOAK7FqKt6vHNyY1kKjTcDaBcGGeecJngkPZ6L3c3BeC98dp/s1600/IM%202.webp',
    author: 'Dr. Jean-Marc Kouassi',
    city: 'Abidjan',
    country: 'CI',
    rating: 5,
    title: 'Soulagement spectaculaire dès la 2ème semaine',
    content: "En tant que professionnel de santé souvent assis, je souffrais d'une sciatique invalidante depuis 8 mois. Après seulement 12 jours d'utilisation régulière des exercices et du protocole, les décharges nerveuses ont disparu. Vraiment remarquable.",
    verified: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'REV-1002',
    productId: 'alphabook',
    productTitle: "Alphabook™ ORIGINAL - 4 Cahiers d’écriture réutilisables",
    productImage: 'https://alphadigitalservices.store/wp-content/uploads/2025/11/537373591_1407622670338491_6368199435420077491_n-1.jpg',
    author: 'Aïcha Diop',
    city: 'Dakar',
    country: 'SN',
    rating: 5,
    title: 'Mes jumeaux adorent, écriture nettement améliorée !',
    content: "L'encre magique qui s'efface toute seule après quelques minutes est tout simplement géniale. Mes enfants de 5 ans prennent plaisir à s'entraîner chaque soir sans gaspiller de papier. Livraison rapide à Dakar.",
    verified: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'REV-1003',
    productId: 'kine-gn',
    productTitle: "Kiné-sciatique™ - Spécial Guinée",
    productImage: 'https://alphadigitalservices.store/wp-content/uploads/2023/11/Capture_d_ecran_2025-07-18_123524.webp',
    author: 'Mamady Camara',
    city: 'Conakry',
    country: 'GN',
    rating: 5,
    title: 'Reçu en 24h à Conakry - Très efficace',
    content: "J'ai payé à la livraison en francs guinéens sans aucun problème. Le produit est conforme aux vidéos et m'a évité des séances de kiné très coûteuses. Je recommande à tous mes collègues.",
    verified: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'REV-1004',
    productId: 'kine',
    productTitle: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
    productImage: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjSi7bJcBkzia8MviCzfV_0HYzvMzKS0a6yG5z9HtK3gVeeZrjubxGpNsFZyS6COiUUT3fYKooyG2lXm8RQ9m91_pcB6JDxdJ1Uyq-hibe2FC5pAG8Dxlc0tTxLbgu0OwvFI0ndJBM4uQDiUOAK7FqKt6vHNyY1kKjTcDaBcGGeecJngkPZ6L3c3BeC98dp/s1600/IM%202.webp',
    author: 'Mariam Traoré',
    city: 'Bamako',
    country: 'ML',
    rating: 4,
    title: 'Très bon produit, notice claire',
    content: "Très satisfaite de mon achat. Les explications sont simples et faciles à suivre même pour une personne âgée. Petit retard de livraison de 24h mais le livreur était très courtois.",
    verified: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
  },
  {
    id: 'REV-1005',
    productId: 'alphabook',
    productTitle: "Alphabook™ ORIGINAL - 4 Cahiers d’écriture réutilisables",
    productImage: 'https://alphadigitalservices.store/wp-content/uploads/2025/11/537373591_1407622670338491_6368199435420077491_n-1.jpg',
    author: 'Patrice Ondimba',
    city: 'Libreville',
    country: 'GA',
    rating: 5,
    title: 'Excellente qualité de fabrication',
    content: "Les rainures sont parfaites pour guider la main des petits. Mon fils tient enfin son stylo correctement. Les recharges d'encre fournies sont copieuses.",
    verified: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: 'REV-1006',
    productId: 'kine',
    productTitle: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
    productImage: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjSi7bJcBkzia8MviCzfV_0HYzvMzKS0a6yG5z9HtK3gVeeZrjubxGpNsFZyS6COiUUT3fYKooyG2lXm8RQ9m91_pcB6JDxdJ1Uyq-hibe2FC5pAG8Dxlc0tTxLbgu0OwvFI0ndJBM4uQDiUOAK7FqKt6vHNyY1kKjTcDaBcGGeecJngkPZ6L3c3BeC98dp/s1600/IM%202.webp',
    author: 'Hervé Kaboré',
    city: 'Ouagadougou',
    country: 'BF',
    rating: 5,
    title: 'Plus de douleurs lombaires au réveil',
    content: "Je n'y croyais pas trop au début mais après 3 semaines mes douleurs du bas du dos ont pratiquement disparu. Merci pour la rapidité du service client sur WhatsApp.",
    verified: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString()
  },
  {
    id: 'REV-1007',
    productId: 'alphabook',
    productTitle: "Alphabook™ ORIGINAL - 4 Cahiers d’écriture réutilisables",
    productImage: 'https://alphadigitalservices.store/wp-content/uploads/2025/11/537373591_1407622670338491_6368199435420077491_n-1.jpg',
    author: 'Célestine Adjovi',
    city: 'Cotonou',
    country: 'BJ',
    rating: 4,
    title: 'Cahiers très instructifs',
    content: "Commandé pour ma nièce en classe de CP. Elle s'amuse beaucoup avec les chiffres et les formes. Très bon outil éducatif.",
    verified: false,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'REV-1008',
    productId: 'kine',
    productTitle: "Kiné-sciatique™ - Comment j'ai évité l'opération de la hanche",
    productImage: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjSi7bJcBkzia8MviCzfV_0HYzvMzKS0a6yG5z9HtK3gVeeZrjubxGpNsFZyS6COiUUT3fYKooyG2lXm8RQ9m91_pcB6JDxdJ1Uyq-hibe2FC5pAG8Dxlc0tTxLbgu0OwvFI0ndJBM4uQDiUOAK7FqKt6vHNyY1kKjTcDaBcGGeecJngkPZ6L3c3BeC98dp/s1600/IM%202.webp',
    author: 'David Mboumba',
    city: 'Pointe-Noire',
    country: 'CG',
    rating: 3,
    title: 'Produit correct mais livraison un peu longue',
    content: "Le produit fonctionne bien mais le livreur a mis 3 jours à arriver. Le support a néanmoins été très rassurant.",
    verified: true,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString()
  }
];

const getReviews = async () => {
  const kv = getKv();
  if (!kv) return defaultReviews;
  const stored = await kv.get(KV_KEY, 'json');
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    await kv.put(KV_KEY, JSON.stringify(defaultReviews));
    return defaultReviews;
  }
  return stored;
};

const saveReviews = async (reviews: any[]) => {
  const kv = getKv();
  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(reviews));
  }
};

export const GET: APIRoute = async () => {
  const reviews = await getReviews();
  return new Response(JSON.stringify(reviews), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json() as any;
  if (!body.author || !body.productId || !body.content) {
    return new Response(JSON.stringify({ error: 'Missing required review fields' }), { status: 400 });
  }

  const reviews = await getReviews();
  const id = body.id || `REV-${Date.now().toString().slice(-5)}`;
  const index = reviews.findIndex((r: any) => r.id === id);

  const reviewItem = {
    id,
    productId: body.productId,
    productTitle: body.productTitle || '',
    productImage: body.productImage || '',
    author: body.author,
    city: body.city || '',
    country: body.country || 'CI',
    rating: Number(body.rating) || 5,
    title: body.title || '',
    content: body.content,
    verified: body.verified !== undefined ? Boolean(body.verified) : true,
    status: body.status || 'PUBLISHED',
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    reviews[index] = { ...reviews[index], ...reviewItem };
  } else {
    reviews.unshift(reviewItem);
  }

  await saveReviews(reviews);
  return new Response(JSON.stringify({ success: true, review: reviewItem }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};
