import { DESKTOP_USER_AGENT } from '../_utils/userAgent';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store',
};

const UNDEFINED_PROPERTY_PATTERN = /:\s*undefined(?=\s*[,}])/g;
const EMPTY_MAP_PROPERTY_PATTERN = /:\s*new\s+Map\s*\(\s*\[\s*\]\s*\)(?=\s*[,}])/g;

interface XhsNoteData {
  imageUrls: string[];
  title?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/** Parse the JSON-like state serialized by Xiaohongshu without executing page JavaScript. */
export const parseXhsInitialState = (serializedState: string): unknown => {
  const normalizedState = serializedState
    .replace(UNDEFINED_PROPERTY_PATTERN, ':null')
    .replace(EMPTY_MAP_PROPERTY_PATTERN, ':{}');

  return JSON.parse(normalizedState);
};

const getNoteData = (state: unknown, postId: string): XhsNoteData | null => {
  if (!isRecord(state) || !isRecord(state.note)) return null;
  if (!isRecord(state.note.noteDetailMap)) return null;

  const noteEntry = state.note.noteDetailMap[postId];
  if (!isRecord(noteEntry) || !isRecord(noteEntry.note)) return null;
  if (!Array.isArray(noteEntry.note.imageList)) return null;

  const imageUrls = noteEntry.note.imageList.map((image) => {
    if (!isRecord(image)) return null;
    if (typeof image.urlDefault === 'string') return image.urlDefault;
    return typeof image.url === 'string' ? image.url : null;
  });

  if (imageUrls.some((url) => url === null)) return null;

  return {
    imageUrls: imageUrls.filter((url): url is string => url !== null),
    ...(typeof noteEntry.note.title === 'string' ? { title: noteEntry.note.title } : {}),
  };
};

const transformToOriginal = (urlStr: string): string => {
  try {
    const url = new URL(urlStr);
    const { hostname, pathname } = url;

    // 1. 处理 xhscdn.com 域名
    if (hostname.includes('xhscdn.com')) {
      const segments = pathname.split('/').filter(Boolean);
      const subdirsAndId = segments.slice(2);
      const lastSegment = subdirsAndId.pop() || '';
      const imageId = lastSegment.split('!')[0];

      return `https://ci.xiaohongshu.com/${[...subdirsAndId, imageId].join('/')}`;
    }

    // 2. 处理 ci.xiaohongshu.com (直接去查询参数)
    if (hostname === 'ci.xiaohongshu.com') {
      return `${url.origin}${pathname}`;
    }

    // 3. 处理头像
    if (hostname === 'img.xiaohongshu.com' && pathname.includes('/avatar/')) {
      const avatarId = pathname.split('/').pop()?.split('@')[0];
      return `https://img.xiaohongshu.com/avatar/${avatarId}`;
    }

    return urlStr;
  } catch {
    return urlStr;
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
};

export const handleXhsImagesRequest = async (
  request: Request,
  fetcher: typeof fetch = fetch
): Promise<Response> => {
  const fail = (error: string, status: number): Response =>
    new Response(JSON.stringify({ error }), { status, headers: CORS_HEADERS });

  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return fail('请使用 JSON 提交提取请求', 415);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('请求内容不是有效的 JSON', 400);
  }
  if (
    !isRecord(body) ||
    typeof body.postId !== 'string' ||
    !/^[a-f0-9]{24}$/i.test(body.postId) ||
    typeof body.xsecToken !== 'string' ||
    !body.xsecToken.trim() ||
    (body.cookie !== undefined &&
      (typeof body.cookie !== 'string' || /[\r\n]/.test(body.cookie))) ||
    (body.xsecSource !== undefined && typeof body.xsecSource !== 'string')
  ) {
    return fail('链接参数或 Cookie 无效，请重新复制完整分享链接和 Cookie', 400);
  }

  const { postId, xsecToken, cookie, xsecSource } = body;
  const targetUrl = new URL(`https://www.xiaohongshu.com/explore/${postId}`);
  targetUrl.searchParams.set('xsec_token', xsecToken);
  if (typeof xsecSource === 'string' && xsecSource) {
    targetUrl.searchParams.set('xsec_source', xsecSource);
  }
  try {
    const response = await fetcher(targetUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Referer: 'https://www.xiaohongshu.com/',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Cookie: typeof cookie === 'string' && cookie.trim() ? cookie.trim() : 'webId=anonymous',
        'Cache-Control': 'no-store',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      const destination = location ? new URL(location, targetUrl) : null;
      return fail(
        destination?.pathname === '/login'
          ? '小红书要求登录，请设置或更新网页 Cookie 后重试'
          : '小红书返回了跳转页面，暂时无法读取帖子，请在小红书网页确认链接可访问',
        404
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      return fail(
        `小红书拒绝了帖子请求（HTTP ${response.status}），请稍后重试或检查网页访问状态`,
        500
      );
    }

    const html = await response.text();

    // 提取 window.__INITIAL_STATE__
    const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})(?:<\/script>|;|$)/;
    const match = html.match(stateRegex);

    if (!match) {
      return new Response(
        JSON.stringify({ error: '小红书页面中未找到帖子数据，可能是验证页面或页面结构已变化' }),
        {
          status: 404,
          headers: CORS_HEADERS,
        }
      );
    }

    const state = parseXhsInitialState(match[1]);
    const noteData = getNoteData(state, postId);

    if (!noteData) {
      return new Response(
        JSON.stringify({
          error: '未获取到帖子图片，请确认帖子可访问、分享链接有效，或更新网页 Cookie',
        }),
        {
          status: 404,
          headers: CORS_HEADERS,
        }
      );
    }

    const originalImages = noteData.imageUrls.map(transformToOriginal);

    return new Response(JSON.stringify({ images: originalImages, title: noteData.title }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error:
          err instanceof SyntaxError
            ? '小红书页面数据解析失败，页面结构可能已变化'
            : '请求小红书失败，请检查网络后重试',
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
};

export const onRequestPost: PagesFunction = async ({ request }) => handleXhsImagesRequest(request);

// Also export onRequest to handle all methods if needed
export const onRequest: PagesFunction = async (context) => {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return onRequestOptions(context);
  }

  if (request.method === 'POST') {
    return onRequestPost(context);
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: CORS_HEADERS,
  });
};
