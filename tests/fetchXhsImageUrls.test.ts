import { describe, expect, it } from 'vitest';

import { handleXhsImagesRequest, parseXhsInitialState } from '../functions/api/fetchXhsImageUrls';

describe('parseXhsInitialState', () => {
  it('normalizes undefined properties and empty Map instances from Xiaohongshu', () => {
    const serializedState =
      '{"note":{"noteDetailMap":{"post":{"note":{"title":"test","imageList":[]}}}},' +
      '"optional":undefined,"AiNoteDetailStore":{"noteDetailMap":new Map([])}}';

    expect(parseXhsInitialState(serializedState)).toEqual({
      note: {
        noteDetailMap: {
          post: {
            note: {
              title: 'test',
              imageList: [],
            },
          },
        },
      },
      optional: null,
      AiNoteDetailStore: {
        noteDetailMap: {},
      },
    });
  });
});

const POST_ID = '6a7f18fb000000002800bec7';
const createRequest = (userAgent = 'iPhone Mobile Safari') =>
  new Request('https://example.com/api/fetchXhsImageUrls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent },
    body: JSON.stringify({
      postId: POST_ID,
      xsecToken: 'test+token&part=value',
      xsecSource: 'app_share',
      cookie: 'session=test',
    }),
  });

describe('Xiaohongshu request behavior', () => {
  it('preserves access parameters and uses the same complete UA for desktop and mobile', async () => {
    const agents: string[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('xsec_token')).toBe('test+token&part=value');
      expect(url.searchParams.get('xsec_source')).toBe('app_share');
      expect(url.searchParams.has('part')).toBe(false);
      const headers = new Headers(init?.headers);
      expect(headers.get('Cookie')).toBe('session=test');
      agents.push(headers.get('User-Agent') || '');
      return new Response(
        `<script>window.__INITIAL_STATE__={"note":{"noteDetailMap":{"${POST_ID}":{"note":{"imageList":[]}}}}}</script>`
      );
    };
    for (const ua of ['iPhone Mobile Safari', 'Android Chrome', 'Desktop Chrome']) {
      expect((await handleXhsImagesRequest(createRequest(ua), fetcher)).ok).toBe(true);
    }
    expect(new Set(agents).size).toBe(1);
    expect(agents[0]).toContain('Windows NT');
  });

  it('reports login redirects without forwarding the Cookie to the destination', async () => {
    let calls = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      calls += 1;
      expect(init?.redirect).toBe('manual');
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    };
    const response = await handleXhsImagesRequest(createRequest(), fetcher);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: '小红书要求登录，请设置或更新网页 Cookie 后重试',
    });
    expect(calls).toBe(1);
  });

  it('rejects invalid requests before any upstream work', async () => {
    const fetcher: typeof fetch = async () => {
      throw new Error('Must not fetch');
    };
    const response = await handleXhsImagesRequest(
      new Request('https://example.com/api/fetchXhsImageUrls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
      fetcher
    );
    expect(response.status).toBe(400);
  });
});
