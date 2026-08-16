import { convertMobileToPcUA } from '../_utils/convertUa';
import { isHeif } from '../_utils/isHeif';

const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface ImageSourceConfig {
  url: URL;
  referer: string;
}

const isXhsImageHost = (hostname: string): boolean => {
  return (
    hostname === 'ci.xiaohongshu.com' ||
    hostname === 'img.xiaohongshu.com' ||
    hostname === 'xhscdn.com' ||
    hostname.endsWith('.xhscdn.com')
  );
};

/**
 * 验证待代理的图片地址，并为不同来源选择防盗链所需的 Referer。
 * 严格限制协议和 CDN 域名，避免该接口成为可访问任意地址的开放代理。
 */
export const getImageSourceConfig = (imageUrl: string): ImageSourceConfig | null => {
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      return null;
    }

    const hostname = url.hostname.toLowerCase();
    if (hostname === 'bbs.hycdn.cn') {
      return { url, referer: 'https://www.skland.com/' };
    }

    if (isXhsImageHost(hostname)) {
      return { url, referer: 'https://www.xiaohongshu.com/' };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * 服务端拉取图片以绕过浏览器 CORS 限制。上游请求使用与图片来源匹配的
 * Referer，否则森空岛 CDN 会拒绝携带小红书 Referer 的请求。
 */
export const handleImageRequest = async (
  request: Request,
  fetcher: typeof fetch = fetch
): Promise<Response> => {
  const imageUrl = new URL(request.url).searchParams.get('url');
  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const source = getImageSourceConfig(imageUrl);
  if (!source) {
    return new Response('Unsupported image URL', { status: 400 });
  }

  try {
    const userAgent = convertMobileToPcUA(request.headers.get('user-agent')) || FALLBACK_UA;
    const response = await fetcher(source.url, {
      // 不自动跟随到未校验的目标，避免受信 CDN 的重定向绕过域名白名单。
      redirect: 'manual',
      headers: {
        'User-Agent': userAgent,
        Referer: source.referer,
      },
    });

    if (!response.ok) {
      console.error(`Image upstream request failed with status ${response.status}`);
      return new Response('Failed to fetch image', { status: 502 });
    }

    // 小红书海外 CDN 会把 HEIC 原图的 Content-Type 误标成 image/jpeg，
    // 因此按魔数判断真实格式；森空岛等其他格式则保留上游类型。
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
    console.error('Image proxy request failed', error);
    return new Response('Failed to fetch image', { status: 502 });
  }
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === 'GET') {
    return await handleImageRequest(request);
  }

  return new Response('Method Not Allowed', { status: 405 });
};
