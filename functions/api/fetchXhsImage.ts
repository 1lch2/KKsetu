const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const transformToOriginal = (urlStr: string): string => {
  try {
    const url = new URL(urlStr);
    const { hostname, pathname } = url;

    // 1. 处理 xhscdn.com 域名
    if (hostname.includes('xhscdn.com')) {
      const segments = pathname.split('/').filter(Boolean);
      // 匹配 Ruby 中的模式: [subdomain, domain, date(12), hash(32), *subdirs, id!...]
      // segments[0] 是日期, segments[1] 是哈希
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

export const onRequestGet: PagesFunction = async (context: EventContext<Env, any, any>) => {
  const { request } = context;
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId');
  const xsecToken = url.searchParams.get('xsecToken');

  if (!postId || !xsecToken) {
    return new Response(JSON.stringify({ error: 'Missing postId or xsecToken' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = `https://www.xiaohongshu.com/explore/${postId}?xsec_token=${xsecToken}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || FALLBACK_UA,
        Referer: 'https://www.xiaohongshu.com/',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Cookie: 'webId=anonymous',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 处理 JSON 中的 undefined 并解析
    const state = JSON.parse(match[1].replace(/:undefined/g, ':null'));
    const noteData = state.note?.noteDetailMap?.[postId]?.note;

    if (!noteData?.imageList) {
      return new Response(JSON.stringify({ error: 'Image list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const originalImages = noteData.imageList.map((img: any) =>
      transformToOriginal(img.urlDefault || img.url)
    );

    return new Response(JSON.stringify({ images: originalImages, title: noteData.title }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
