const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const parseShortLink = async (shortLinkShareContent: string): Promise<string> => {
  // example short link share content:
  // ◻️ http://xhslink.com/o/5vEkRNV4w87 复制后打开【小红书】查看笔记！

  try {
    // Extract short link using regex - match http://xhslink.com/ or https://xhslink.com/ followed by path
    const shortLinkRegex = /(https?:\/\/xhslink\.com\/[a-zA-Z0-9\/]+)/;
    const match = shortLinkShareContent.match(shortLinkRegex);

    if (!match) {
      throw new Error('No short link found in content');
    }

    const shortUrl = match[1];

    // Use fetch with redirect follow to get the final URL
    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': FALLBACK_UA,
        Referer: 'https://www.xiaohongshu.com/',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    // Return the final URL after all redirects
    return response.url;
  } catch (error: any) {
    throw new Error(`Failed to parse short link: ${error.message}`);
  }
};

const onRequestGet: PagesFunction = async (context: EventContext<Env, any, any>) => {
  const { request } = context;
  const url = new URL(request.url);
  const content = url.searchParams.get('content');

  if (!content) {
    return new Response(JSON.stringify({ error: 'Missing content parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const fullLink = await parseShortLink(content);
    return new Response(JSON.stringify({ fullLink }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
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
