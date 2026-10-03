import { afterEach, describe, expect, it, vi } from 'vitest';
import heic2any from 'heic2any';

import { getXhsImages } from '../src/hooks/useGetXhsImages';

vi.mock('heic2any', () => ({ default: vi.fn() }));
vi.mock('../src/utils/constants', () => ({ BASE_URL: 'http://127.0.0.1:8788' }));

const TEST_URL =
  'https://www.xiaohongshu.com/explore/6a7f18fb000000002800bec7' +
  '?xsec_token=test%2Btoken%3D&xsec_source=pc_feed';

const stubBrowserGlobals = (fetcher: typeof fetch) => {
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('localStorage', { getItem: () => '' });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('getXhsImages', () => {
  it('propagates a short-link failure instead of caching an empty success', async () => {
    stubBrowserGlobals(async () =>
      Response.json({ error: 'Short link did not resolve' }, { status: 400 })
    );
    await expect(getXhsImages('https://xhslink.cn/o/test')).rejects.toThrow('短链接解析失败');
  });

  it('rejects incomplete links without making an upstream request', async () => {
    const fetcher = vi.fn();
    stubBrowserGlobals(fetcher);
    await expect(getXhsImages(TEST_URL.split('?')[0])).rejects.toThrow('链接缺少访问参数');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('propagates the upstream failure and handles non-JSON gateway errors', async () => {
    stubBrowserGlobals(async () => Response.json({ error: '需要登录' }, { status: 404 }));
    await expect(getXhsImages(TEST_URL)).rejects.toThrow('帖子提取失败：需要登录');
    stubBrowserGlobals(async () => new Response('<html>Gateway error</html>', { status: 502 }));
    await expect(getXhsImages(TEST_URL)).rejects.toThrow('非 JSON 响应（HTTP 502）');
  });

  it('reports a post without pictures instead of showing the initial placeholder', async () => {
    stubBrowserGlobals(async () => Response.json({ images: [] }));
    await expect(getXhsImages(TEST_URL)).rejects.toThrow('该帖子没有可提取的图片');
  });

  it('keeps successful images when downloads and HEIC conversion fail', async () => {
    vi.mocked(heic2any).mockRejectedValue(new Error('Conversion failed'));
    stubBrowserGlobals(async (input) => {
      const url = String(input);
      if (url.includes('fetchXhsImageUrls')) {
        return Response.json({
          images: [
            'https://ci.xiaohongshu.com/good',
            'https://ci.xiaohongshu.com/bad',
            'https://ci.xiaohongshu.com/heic',
          ],
        });
      }
      if (url.includes('bad')) return new Response(null, { status: 502 });
      return new Response('image', {
        headers: { 'Content-Type': url.includes('heic') ? 'image/heic' : 'image/png' },
      });
    });
    const result = await getXhsImages(TEST_URL);
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toBeInstanceOf(Blob);
    expect(result.failedCount).toBe(2);
  });

  it('reports download failure when none of the images succeed', async () => {
    stubBrowserGlobals(async (input) =>
      String(input).includes('fetchXhsImageUrls')
        ? Response.json({ images: ['https://ci.xiaohongshu.com/bad'] })
        : new Response(null, { status: 502 })
    );
    await expect(getXhsImages(TEST_URL)).rejects.toThrow('图片下载失败');
  });

  it('stops scheduling image batches after cancellation', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes('fetchXhsImageUrls')) {
        controller.abort();
        return Response.json({ images: ['https://ci.xiaohongshu.com/image'] });
      }
      throw new Error('Cancelled work must not download images');
    });
    stubBrowserGlobals(fetcher);
    await expect(getXhsImages(TEST_URL, controller.signal)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
