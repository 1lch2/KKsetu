import { convertMobileToPcUA } from '../_utils/convertUa';
import { isHeif } from '../_utils/isHeif';

const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const onRequestGet: PagesFunction = async (context: EventContext<Env, any, any>) => {
  const { request } = context;
  const { searchParams } = new URL(context.request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const userAgent = convertMobileToPcUA(request.headers.get('user-agent'));

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': userAgent ?? FALLBACK_UA,
        Referer: 'https://www.xiaohongshu.com/',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch image');

    // 小红书海外 CDN 会把 HEIC 原图的 Content-Type 误标成 image/jpeg，
    // 因此按魔数判断真实格式，而非信任响应头。
    const buffer = await response.arrayBuffer();
    const originalType = response.headers.get('content-type') || 'application/octet-stream';
    const contentType = isHeif(buffer) ? 'image/heic' : originalType;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }
};

// Also export onRequest to handle all methods if needed
export const onRequest: PagesFunction = async (context: EventContext<Env, any, any>) => {
  const { request } = context;

  if (request.method === 'GET') {
    return onRequestGet(context);
  }

  return new Response('Method Not Allowed', { status: 405 });
};
