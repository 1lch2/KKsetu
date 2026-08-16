import { convertMobileToPcUA } from '../_utils/convertUa';

const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '86400',
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

export const onRequestPost: PagesFunction = async (context: EventContext<Env, any, any>) => {
  const { request } = context;
  const body = await request.json<{ postId: string; xsecToken: string; cookie?: string }>();
  const { postId, xsecToken, cookie } = body;

  if (!postId || !xsecToken) {
    return new Response(JSON.stringify({ error: 'Missing postId or xsecToken' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const targetUrl = `https://www.xiaohongshu.com/explore/${postId}?xsec_token=${xsecToken}`;
  // Remove Mobile User-agent field.
  const userAgent = convertMobileToPcUA(request.headers.get('user-agent'));
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': userAgent ?? FALLBACK_UA,
        Referer: 'https://www.xiaohongshu.com/',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Cookie: cookie || 'webId=anonymous',
        'Cache-Control': 'public, max-age=86400',
      },
    });

    if (!response.ok) throw new Error(`XHS returned ${response.status}`);

    const html = await response.text();

    // 提取 window.__INITIAL_STATE__
    const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})(?:<\/script>|;|$)/;
    const match = html.match(stateRegex);

    if (!match) {
      return new Response(JSON.stringify({ error: 'Initial state not found' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const state = parseXhsInitialState(match[1]);
    const noteData = getNoteData(state, postId);

    if (!noteData) {
      return new Response(JSON.stringify({ error: 'Image list not found' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const originalImages = noteData.imageUrls.map(transformToOriginal);

    return new Response(JSON.stringify({ images: originalImages, title: noteData.title }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
};

// Also export onRequest to handle all methods if needed
export const onRequest: PagesFunction = async (context: EventContext<Env, any, any>) => {
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
