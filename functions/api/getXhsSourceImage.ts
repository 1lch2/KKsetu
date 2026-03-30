const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const isHeic = async (
  imageUrl: string,
  headers: Headers
): Promise<{ isHeic: boolean; data?: Blob; originalUrl?: string }> => {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': headers.get('user-agent') || FALLBACK_UA,
        Referer: 'https://www.xiaohongshu.com/',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch image');

    const contentType = response.headers.get('content-type') || '';
    const heicMimeTypes = ['image/heic', 'image/heif', 'image/heic-ext'];

    // Check if the image is HEIC format based on MIME type
    if (heicMimeTypes.some((mimeType) => contentType.includes(mimeType))) {
      const blob = await response.blob();
      return { isHeic: true, data: blob };
    }

    // For non-HEIC images, return the original URL
    return { isHeic: false, originalUrl: imageUrl };
  } catch (error) {
    console.error('Error checking HEIC format:', error);
    // Default to non-HEIC if check fails
    return { isHeic: false, originalUrl: imageUrl };
  }
};

const onRequestGet: PagesFunction = async (context: EventContext<Env, any, any>) => {
  const { request } = context;
  const { searchParams } = new URL(context.request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const heicCheck = await isHeic(imageUrl, request.headers);

    if (heicCheck.isHeic && heicCheck.data) {
      // Return HEIC blob to client
      return new Response(heicCheck.data, {
        status: 200,
        headers: {
          'User-Agent': request.headers.get('user-agent') || FALLBACK_UA,
          'Content-Type': 'image/heic',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          Cookie: 'webId=anonymous',
        },
      });
    }

    // For non-HEIC images, pass original URL back to client
    return new Response(
      JSON.stringify({
        originalUrl: heicCheck.originalUrl,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
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
