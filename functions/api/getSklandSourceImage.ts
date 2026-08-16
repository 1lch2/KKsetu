import { handleImageProxyRequest } from '../_utils/imageProxy';

const SKLAND_IMAGE_POLICY = {
  isAllowedHostname: (hostname: string): boolean => hostname === 'bbs.hycdn.cn',
  referer: 'https://www.skland.com/',
};

export const handleSklandImageRequest = async (
  request: Request,
  fetcher: typeof fetch = fetch
): Promise<Response> => {
  return await handleImageProxyRequest(request, SKLAND_IMAGE_POLICY, fetcher);
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method === 'GET') {
    return await handleSklandImageRequest(request);
  }

  return new Response('Method Not Allowed', { status: 405 });
};
