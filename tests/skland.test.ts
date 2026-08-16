import { afterEach, describe, expect, it, vi } from 'vitest';

import { invalidateShumeiDeviceId } from '../functions/_utils/shumei';
import {
  createBaseHeaders,
  createSklandSignature,
  extractSklandImages,
  normalizeSklandImageUrl,
  parseSklandArticleId,
  parseSklandItemResponse,
  SklandError,
} from '../functions/_utils/skland';

afterEach(() => {
  invalidateShumeiDeviceId();
  vi.restoreAllMocks();
});

describe('parseSklandArticleId', () => {
  it.each([
    ['https://www.skland.com/article?id=1913385', '1913385'],
    ['https://m.skland.com/article?id=1913385', '1913385'],
    ['https://www.skland.com/h/detail?id=611376', '611376'],
  ])('parses %s', (url, articleId) => {
    expect(parseSklandArticleId(url)).toBe(articleId);
  });

  it.each([
    'http://www.skland.com/article?id=1',
    'https://evil.skland.com/article?id=1',
    'https://www.skland.com.evil.example/article?id=1',
    'https://www.skland.com/profile?id=1',
    'https://www.skland.com/article',
    'https://www.skland.com/article?id=abc',
    'https://www.skland.com/article?id=1&id=2',
    '森空岛分享 https://www.skland.com/article?id=1',
  ])('rejects unsupported input: %s', (url) => {
    expect(() => parseSklandArticleId(url)).toThrowError(SklandError);
  });
});

describe('Skland signing', () => {
  it('uses the fixed header order and excludes the question mark', () => {
    const headers = createBaseHeaders('Bdevice', 1_720_000_000_000);

    expect(createSklandSignature('token', '/web/v1/item', 'id=1913385', headers)).toBe(
      'afaf09766e88395800e67771620c0fe9'
    );
  });
});

describe('Skland image parsing', () => {
  it('removes query and hash only for bbs.hycdn.cn', () => {
    expect(
      normalizeSklandImageUrl(
        'https://bbs.hycdn.cn/image/file.webp?x-oss-process=style/item_style#preview'
      )
    ).toBe('https://bbs.hycdn.cn/image/file.webp');
    expect(normalizeSklandImageUrl('https://cdn.example.com/file.webp?size=full#preview')).toBe(
      'https://cdn.example.com/file.webp?size=full#preview'
    );
    expect(normalizeSklandImageUrl('http://bbs.hycdn.cn/image/file.webp')).toBeNull();
  });

  it('keeps order, filters invalid entries, and removes duplicates', () => {
    expect(
      parseSklandItemResponse(
        {
          code: 0,
          data: {
            item: {
              title: '测试帖子',
              imageListSlice: [
                { url: 'https://bbs.hycdn.cn/image/one.webp?style=small' },
                { url: 'javascript:alert(1)' },
                { url: 'https://bbs.hycdn.cn/image/one.webp?style=large' },
                { url: 'https://cdn.example.com/two.webp?key=value' },
              ],
            },
          },
        },
        '1913385'
      )
    ).toEqual({
      articleId: '1913385',
      title: '测试帖子',
      images: [
        'https://bbs.hycdn.cn/image/one.webp',
        'https://cdn.example.com/two.webp?key=value',
      ],
    });
  });

  it('maps the upstream missing-content code to ARTICLE_NOT_FOUND', () => {
    expect(() =>
      parseSklandItemResponse({ code: 1019, message: '内容找不到了' }, '999999999')
    ).toThrowError(expect.objectContaining({ code: 'ARTICLE_NOT_FOUND' }));
  });
});

describe('Skland request chain', () => {
  it('uses only fixed upstream URLs and returns normalized images', async () => {
    const requestedUrls: string[] = [];
    let itemTimestamp: string | null = null;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      requestedUrls.push(url);

      if (url.includes('deviceprofile')) {
        return Response.json({ code: 1100, detail: { deviceId: 'device-id' } });
      }
      if (url.endsWith('/auth/refresh')) {
        return Response.json(
          { code: 0, data: { token: 'token' } },
          { headers: { Date: 'Thu, 04 Jul 2024 09:46:45 GMT' } }
        );
      }
      itemTimestamp = new Headers(init?.headers).get('timestamp');
      return Response.json({
        code: 0,
        data: {
          item: {
            imageListSlice: [
              { url: 'https://bbs.hycdn.cn/image/original.webp?x-oss-process=style/item_style' },
            ],
          },
        },
      });
    });

    const result = await extractSklandImages('https://www.skland.com/article?id=1913385', {
      fetcher,
      now: () => 1_720_000_000_000,
      randomUUID: () => '11111111-1111-4111-8111-111111111111',
    });

    expect(result.images).toEqual(['https://bbs.hycdn.cn/image/original.webp']);
    expect(itemTimestamp).toBe('1720086405');
    expect(requestedUrls).toEqual([
      'https://fp-it.portal101.cn/deviceprofile/v4',
      'https://zonai.skland.com/web/v1/auth/refresh',
      'https://zonai.skland.com/web/v1/item?id=1913385',
    ]);
  });

  it('rebuilds the device once after an authentication failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let requestIndex = 0;
    const fetcher = vi.fn(async () => {
      requestIndex += 1;
      if (requestIndex === 1 || requestIndex === 4) {
        return Response.json({ code: 1100, detail: { deviceId: `device-${requestIndex}` } });
      }
      if (requestIndex === 2 || requestIndex === 5) {
        return Response.json({ code: 0, data: { token: `token-${requestIndex}` } });
      }
      if (requestIndex === 3) {
        return Response.json({ code: 10003 }, { status: 401 });
      }
      return Response.json({ code: 0, data: { item: { imageListSlice: [] } } });
    });

    await expect(
      extractSklandImages('https://www.skland.com/article?id=1913385', {
        fetcher,
        now: () => 1_720_000_000_000,
        randomUUID: () => '11111111-1111-4111-8111-111111111111',
      })
    ).resolves.toMatchObject({ articleId: '1913385', images: [] });
    expect(fetcher).toHaveBeenCalledTimes(6);
  });

  it('maps an aborted upstream request to UPSTREAM_TIMEOUT', async () => {
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        );
      });
    });

    await expect(
      extractSklandImages('https://www.skland.com/article?id=1913385', {
        fetcher,
        timeoutMs: 5,
      })
    ).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT' });
  });
});
