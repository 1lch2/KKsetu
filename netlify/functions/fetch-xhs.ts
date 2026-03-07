import type { Context } from '@netlify/functions';

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

exports.handler = async (req: Request, context: Context) => {
  // 仅允许 GET 请求
  //   if (req.method !== 'GET') {
  //     return { statusCode: 405, body: 'Method Not Allowed' };
  //   }

  // 将 req 临时视为 any 或扩展类型
  const url = new URL((req as any).rawUrl || req.url);
  const postId = url.searchParams.get('postId');
  const xsecToken = url.searchParams.get('xsecToken');

  if (!postId || !xsecToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing postId or xsecToken' }),
    };
  }

  const targetUrl = `https://www.xiaohongshu.com/explore/${postId}?xsec_token=${xsecToken}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.xiaohongshu.com/',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        Cookie: 'webId=anonymous', // 传入基础 Cookie 避开某些风控
      },
    });

    if (!response.ok) throw new Error(`XHS returned ${response.status}`);

    const html = await response.text();

    // 提取 window.__INITIAL_STATE__
    // 使用更鲁棒的正则：匹配到 </script> 或 ; 或行尾
    const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})(?:<\/script>|;|$)/;
    const match = html.match(stateRegex);

    if (!match) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Initial state not found' }),
      };
    }

    // 处理 JSON 中的 undefined 并解析
    const state = JSON.parse(match[1].replace(/:undefined/g, ':null'));
    const noteData = state.note?.noteDetailMap?.[postId]?.note;

    if (!noteData?.imageList) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Image list not found' }),
      };
    }

    const originalImages = noteData.imageList.map((img: any) =>
      transformToOriginal(img.urlDefault || img.url)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ images: originalImages, title: noteData.title }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
