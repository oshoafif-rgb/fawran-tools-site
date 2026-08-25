// netlify/functions/tool-rating.js
//
// دالة خادم صغيرة (Serverless Function) بتسجّل وترجّع تقييمات حقيقية لكل أداة.
// بتستخدم Netlify Blobs (تخزين مفتاح-قيمة مجاني ومدمج في Netlify، بدون قاعدة بيانات خارجية).
//
// GET  /api/tool-rating?slug=pdf-merge          -> {average, count}
// POST /api/tool-rating  body: {slug, rating}   -> {average, count}

import { getStore } from '@netlify/blobs';

const ALLOWED_ORIGIN = '*'; // موقعك الوحيد اللي بينادي الدالة دي، فمفيش داعي لتقييده أكتر

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Cache-Control': 'public, max-age=120', // كاش دقيقتين لتخفيف الحمل مع بقاء البيانات حديثة نسبيًا
    },
  });
}

function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9\-]{2,80}$/.test(slug);
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  const store = getStore('tool-ratings');

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!isValidSlug(slug)) return jsonResponse({ error: 'invalid slug' }, 400);

    const data = (await store.get(slug, { type: 'json' })) || { count: 0, sum: 0 };
    const average = data.count ? Math.round((data.sum / data.count) * 10) / 10 : 0;
    return jsonResponse({ average, count: data.count });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'invalid JSON body' }, 400);
    }

    const slug = body.slug;
    const rating = Number(body.rating);

    if (!isValidSlug(slug)) return jsonResponse({ error: 'invalid slug' }, 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return jsonResponse({ error: 'rating must be an integer from 1 to 5' }, 400);
    }

    const data = (await store.get(slug, { type: 'json' })) || { count: 0, sum: 0 };
    data.count += 1;
    data.sum += rating;
    await store.set(slug, JSON.stringify(data));

    const average = Math.round((data.sum / data.count) * 10) / 10;
    return jsonResponse({ average, count: data.count });
  }

  return jsonResponse({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/tool-rating' };
