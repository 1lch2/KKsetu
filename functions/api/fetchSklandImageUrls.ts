import { extractSklandImages, SklandError, type SklandErrorCode } from '../_utils/skland';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '86400',
};

const ERROR_DETAILS: Record<SklandErrorCode, { status: number; message: string }> = {
  INVALID_REQUEST: { status: 400, message: '请求内容无效' },
  INVALID_SKLAND_URL: { status: 400, message: '请输入受支持的森空岛帖子链接' },
  ARTICLE_NOT_FOUND: { status: 404, message: '帖子不存在或已被删除' },
  SHUMEI_DEVICE_FAILED: { status: 502, message: '暂时无法建立森空岛访问环境，请稍后重试' },
  UPSTREAM_AUTH_FAILED: { status: 502, message: '暂时无法获取森空岛帖子，请稍后重试' },
  UPSTREAM_RESPONSE_INVALID: { status: 502, message: '森空岛返回了无法识别的数据' },
  UPSTREAM_TIMEOUT: { status: 504, message: '森空岛响应超时，请稍后重试' },
  INTERNAL_ERROR: { status: 500, message: '服务暂时不可用，请稍后重试' },
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const jsonResponse = (body: unknown, status: number): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
};

const errorResponse = (code: SklandErrorCode): Response => {
  const detail = ERROR_DETAILS[code];
  return jsonResponse({ error: { code, message: detail.message } }, detail.status);
};

export const handleSklandRequest = async (request: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let body: unknown;

  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return errorResponse('INVALID_REQUEST');
  }

  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_REQUEST');
  }

  if (
    !isRecord(body) ||
    typeof body.url !== 'string' ||
    body.url.length === 0 ||
    body.url.length > 2048
  ) {
    return errorResponse('INVALID_REQUEST');
  }

  try {
    const result = await extractSklandImages(body.url);
    console.info('Skland extraction completed', {
      requestId,
      articleId: result.articleId,
      imageCount: result.images.length,
      durationMs: Date.now() - startedAt,
    });
    return jsonResponse(result, 200);
  } catch (error) {
    const code = error instanceof SklandError ? error.code : 'INTERNAL_ERROR';
    if (code !== 'INVALID_REQUEST' && code !== 'INVALID_SKLAND_URL') {
      console.error('Skland extraction failed', {
        requestId,
        stage: code,
        durationMs: Date.now() - startedAt,
      });
    }
    return errorResponse(code);
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  return handleSklandRequest(request);
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return onRequestOptions(context);
  if (context.request.method === 'POST') return onRequestPost(context);

  return new Response('Method Not Allowed', {
    status: 405,
    headers: CORS_HEADERS,
  });
};
