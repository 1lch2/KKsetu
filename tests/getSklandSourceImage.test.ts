import { describe, expect, it } from 'vitest';

import { handleSklandImageRequest } from '../functions/api/getSklandSourceImage';

const createProxyRequest = (imageUrl: string): Request => {
  return new Request(
    'https://example.com/api/getSklandSourceImage?url=' + encodeURIComponent(imageUrl)
  );
};

describe('getSklandSourceImage API', () => {
  it('fetches only Skland images with the Skland referer', async () => {
    let receivedReferer = '';
    let receivedRedirect: RequestRedirect | undefined;
    const fetcher: typeof fetch = async (_input, init) => {
      receivedReferer = new Headers(init?.headers).get('Referer') || '';
      receivedRedirect = init?.redirect;
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'Content-Type': 'image/webp' },
      });
    };

    const response = await handleSklandImageRequest(
      createProxyRequest('https://bbs.hycdn.cn/image/example.webp'),
      fetcher
    );

    expect(response.status).toBe(200);
    expect(receivedReferer).toBe('https://www.skland.com/');
    expect(receivedRedirect).toBe('manual');
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('rejects Xiaohongshu and unsafe proxy targets before fetching upstream', async () => {
    let callCount = 0;
    const fetcher: typeof fetch = async () => {
      callCount += 1;
      return new Response();
    };
    const targets = [
      'https://ci.xiaohongshu.com/example',
      'https://example.com/image.webp',
      'https://bbs.hycdn.cn.evil.example/image.webp',
      'http://bbs.hycdn.cn/image.webp',
    ];

    for (const target of targets) {
      const response = await handleSklandImageRequest(createProxyRequest(target), fetcher);
      expect(response.status).toBe(400);
    }
    expect(callCount).toBe(0);
  });
});
