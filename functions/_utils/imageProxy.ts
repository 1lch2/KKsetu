import { convertMobileToPcUA } from './convertUa';

const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface ImageProxyPolicy {
  isAllowedHostname: (hostname: string) => boolean;
  referer: string;
  getContentType?: (buffer: ArrayBuffer, upstreamContentType: string) => string;
}

const getAllowedImageUrl = (
  imageUrl: string,
  isAllowedHostname: ImageProxyPolicy['isAllowedHostname']
): URL | null => {
  try {
    const url = new URL(imageUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !isAllowedHostname(url.hostname.toLowerCase())
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};

export const handleImageProxyRequest = async (
  request: Request,
  policy: ImageProxyPolicy,
  fetcher: typeof fetch = fetch
): Promise<Response> => {
  const imageUrl = new URL(request.url).searchParams.get('url');
  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const allowedImageUrl = getAllowedImageUrl(imageUrl, policy.isAllowedHostname);
  if (!allowedImageUrl) {
    return new Response('Unsupported image URL', { status: 400 });
  }

  try {
    const userAgent = convertMobileToPcUA(request.headers.get('user-agent')) || FALLBACK_UA;
    const response = await fetcher(allowedImageUrl, {
      // Do not follow a trusted CDN redirect to a destination outside the route's allowlist.
      redirect: 'manual',
      headers: {
        'User-Agent': userAgent,
        Referer: policy.referer,
      },
    });

    if (!response.ok) {
      console.error('Image upstream request failed with status ' + response.status);
      return new Response('Failed to fetch image', { status: 502 });
    }

    const buffer = await response.arrayBuffer();
    const upstreamContentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const contentType =
      policy.getContentType?.(buffer, upstreamContentType) || upstreamContentType;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy request failed', error);
    return new Response('Failed to fetch image', { status: 502 });
  }
};
