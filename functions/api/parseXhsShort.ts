import { parseXhsShortLink } from '../_utils/xhsShortLink';

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
    const fullLink = await parseXhsShortLink(content);
    return new Response(JSON.stringify({ fullLink }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `Failed to parse short link: ${message}` }), {
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
