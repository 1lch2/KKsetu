import { handleImageProxyRequest } from '../_utils/imageProxy';
import { isHeif } from '../_utils/isHeif';

const isXhsImageHostname = (hostname: string): boolean => {
  return (
    hostname === 'ci.xiaohongshu.com' ||
    hostname === 'img.xiaohongshu.com' ||
    hostname === 'xhscdn.com' ||
    hostname.endsWith('.xhscdn.com')
  );
};

const XHS_IMAGE_POLICY = {
  isAllowedHostname: isXhsImageHostname,
  referer: 'https://www.xiaohongshu.com/',
  // Xiaohongshu's overseas CDN can label HEIF originals as image/jpeg.
  getContentType: (buffer: ArrayBuffer, upstreamContentType: string): string => {
    return isHeif(buffer) ? 'image/heic' : upstreamContentType;
  },
};

export const handleXhsImageRequest = async (
  request: Request,
  fetcher: typeof fetch = fetch
): Promise<Response> => {
  return await handleImageProxyRequest(request, XHS_IMAGE_POLICY, fetcher);
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === 'GET') {
    return await handleXhsImageRequest(request);
  }

  return new Response('Method Not Allowed', { status: 405 });
};
