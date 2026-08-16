import { describe, expect, it } from 'vitest';

import { handleXhsImageRequest } from '../functions/api/getXhsSourceImage';

const createProxyRequest = (imageUrl: string): Request => {
  return new Request(
    'https://example.com/api/getXhsSourceImage?url=' + encodeURIComponent(imageUrl)
  );
};

describe('getXhsSourceImage API', () => {
  it('fetches only Xiaohongshu images with the Xiaohongshu referer', async () => {
    let receivedReferer = '';
    let receivedRedirect: RequestRedirect | undefined;
    const heifBytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x0c, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);
    const fetcher: typeof fetch = async (_input, init) => {
      receivedReferer = new Headers(init?.headers).get('Referer') || '';
      receivedRedirect = init?.redirect;
      return new Response(heifBytes, {
        headers: { 'Content-Type': 'image/jpeg' },
      });
    };

    const response = await handleXhsImageRequest(
      createProxyRequest('https://sns-img-qc.xhscdn.com/example'),
      fetcher
    );

    expect(response.status).toBe(200);
    expect(receivedReferer).toBe('https://www.xiaohongshu.com/');
    expect(receivedRedirect).toBe('manual');
    expect(response.headers.get('Content-Type')).toBe('image/heic');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('rejects Skland and unsafe proxy targets before fetching upstream', async () => {
    let callCount = 0;
    const fetcher: typeof fetch = async () => {
      callCount += 1;
      return new Response();
    };
    const targets = [
      'https://bbs.hycdn.cn/image/example.webp',
      'https://example.com/image.webp',
      'https://xhscdn.com.evil.example/image.webp',
      'http://ci.xiaohongshu.com/image.webp',
    ];

    for (const target of targets) {
      const response = await handleXhsImageRequest(createProxyRequest(target), fetcher);
      expect(response.status).toBe(400);
    }
    expect(callCount).toBe(0);
  });
});
