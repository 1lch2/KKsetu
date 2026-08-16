import { describe, expect, it } from 'vitest';

import {
  getImageSourceConfig,
  handleImageRequest,
} from '../functions/api/getXhsSourceImage';

const createProxyRequest = (imageUrl: string): Request => {
  return new Request(
    `https://example.com/api/getXhsSourceImage?url=${encodeURIComponent(imageUrl)}`
  );
};

describe('getXhsSourceImage API', () => {
  it('selects the Skland referer for its image CDN', () => {
    const source = getImageSourceConfig(
      'https://bbs.hycdn.cn/image/2025/09/12/3001230/example.webp'
    );

    expect(source?.referer).toBe('https://www.skland.com/');
  });

  it('keeps the Xiaohongshu referer for Xiaohongshu image CDNs', () => {
    expect(getImageSourceConfig('https://sns-img-qc.xhscdn.com/example')?.referer).toBe(
      'https://www.xiaohongshu.com/'
    );
    expect(getImageSourceConfig('https://ci.xiaohongshu.com/example')?.referer).toBe(
      'https://www.xiaohongshu.com/'
    );
  });

  it('rejects unsafe or unsupported proxy targets', () => {
    expect(getImageSourceConfig('http://bbs.hycdn.cn/image/example.webp')).toBeNull();
    expect(getImageSourceConfig('https://bbs.hycdn.cn.evil.example/image/example.webp')).toBeNull();
    expect(getImageSourceConfig('https://example.com/image/example.webp')).toBeNull();
    expect(getImageSourceConfig('not a url')).toBeNull();
  });

  it(
    'fetches Skland images with the matching referer and returns a CORS-readable response',
    async () => {
      let receivedReferer = '';
      let receivedRedirect: RequestRedirect | undefined;
      const fetcher: typeof fetch = async (_input, init) => {
        receivedReferer = new Headers(init?.headers).get('Referer') || '';
        receivedRedirect = init?.redirect;
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'Content-Type': 'image/webp' },
        });
      };

      const response = await handleImageRequest(
        createProxyRequest('https://bbs.hycdn.cn/image/example.webp'),
        fetcher
      );

      expect(response.status).toBe(200);
      expect(receivedReferer).toBe('https://www.skland.com/');
      expect(receivedRedirect).toBe('manual');
      expect(response.headers.get('Content-Type')).toBe('image/webp');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    }
  );

  it('does not call the upstream fetcher for an unsupported host', async () => {
    let called = false;
    const fetcher: typeof fetch = async () => {
      called = true;
      return new Response();
    };

    const response = await handleImageRequest(
      createProxyRequest('https://example.com/image.webp'),
      fetcher
    );

    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });
});
