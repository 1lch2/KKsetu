import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequest } from '../functions/api/parseXhsShort';

const NOTE_URL =
  'http://www.xiaohongshu.com/discovery/item/6ab20646000000003402a93c' +
  '?app_platform=ios&xsec_source=app_share&xsec_token=test%2Btoken%2Fvalue%3D&share_id=test';
const SHARE_CONTENT =
  '【开发设计图・怪物 - 刺花蜘蛛】 当时看见这只怪物的... https://xhslink.cn/o/2WpH3SmPyMm \n' +
  '【小红书】上有超棒的笔记，快来瞧瞧！';

const requestShortLink = (content = SHARE_CONTENT, method = 'GET') =>
  onRequest({
    request: new Request(
      'https://example.com/api/parseXhsShort?content=' + encodeURIComponent(content),
      { method }
    ),
  } as Parameters<typeof onRequest>[0]);

afterEach(() => vi.unstubAllGlobals());

describe('parseXhsShort API', () => {
  it.each([
    NOTE_URL,
    'https://www.xiaohongshu.com/login?redirectPath=' + encodeURIComponent(NOTE_URL),
    '/login?redirectPath=' +
      encodeURIComponent('/discovery/item/6ab20646000000003402a93c?xsec_token=test%2Btoken%3D'),
  ])('resolves the note without fetching the note or login page: %s', async (target) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: target } })
    );
    // A relative login redirect originates on the Xiaohongshu domain.
    if (target.startsWith('/')) {
      fetcher.mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { Location: 'https://www.xiaohongshu.com/share/landing' },
        })
      );
    }
    vi.stubGlobal('fetch', fetcher);

    const response = await requestShortLink();
    expect(response.status).toBe(200);
    const body = await response.json();
    const note = new URL(body.fullLink);
    expect(note.pathname).toBe('/discovery/item/6ab20646000000003402a93c');
    expect(note.searchParams.get('xsec_token')).toBe(
      target.startsWith('/') ? 'test+token=' : 'test+token/value='
    );
    if (!target.startsWith('/')) expect(body.fullLink).toBe(NOTE_URL);
    expect(fetcher).toHaveBeenCalledTimes(target.startsWith('/') ? 2 : 1);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'https://xhslink.cn/o/2WpH3SmPyMm',
      expect.objectContaining({ redirect: 'manual' })
    );
  });

  it('follows relative redirects on both short-link domains', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { Location: '/next' } }))
      .mockResolvedValueOnce(new Response(null, { status: 307, headers: { Location: NOTE_URL } }));
    vi.stubGlobal('fetch', fetcher);
    const response = await requestShortLink('http://xhslink.com/example');
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenNthCalledWith(2, 'http://xhslink.com/next', expect.any(Object));
  });

  it.each([
    'https://evil.example/note',
    'https://www.xiaohongshu.com.evil.example/explore/abc?xsec_token=test',
    'https://user:password@www.xiaohongshu.com/explore/abc?xsec_token=test',
    'https://www.xiaohongshu.com:8443/explore/abc?xsec_token=test',
    'https://www.xiaohongshu.com/login',
    'https://www.xiaohongshu.com/login?redirectPath=' + encodeURIComponent('https://evil.example/'),
    'https://www.xiaohongshu.com/login?redirectPath=' + encodeURIComponent('javascript:alert(1)'),
  ])('rejects invalid destinations without fetching them: %s', async (target) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: target } })
    );
    vi.stubGlobal('fetch', fetcher);
    expect((await requestShortLink()).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('bounds redirect loops', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response(null, { status: 302, headers: { Location: '/loop' } })
    );
    vi.stubGlobal('fetch', fetcher);
    expect((await requestShortLink()).status).toBe(400);
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it.each([200, 302, 403, 500])('rejects an unresolved response (%s)', async (status) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status })));
    expect((await requestShortLink()).status).toBe(400);
  });

  it('preserves input and method validation', async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetcher);
    expect((await requestShortLink('')).status).toBe(400);
    expect((await requestShortLink('no link')).status).toBe(400);
    expect((await requestShortLink(SHARE_CONTENT, 'POST')).status).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
