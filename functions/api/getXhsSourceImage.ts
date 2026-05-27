import { convertMobileToPcUA } from '../_utils/convertUa';

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

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new Response(response.body, {
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
