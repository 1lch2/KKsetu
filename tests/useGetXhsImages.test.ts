import { afterEach, describe, expect, it, vi } from 'vitest';

import { getXhsImageUrls } from '../src/hooks/useGetXhsImages';

vi.mock('heic2any', () => ({ default: vi.fn() }));
vi.mock('../src/utils/constants', () => ({ BASE_URL: 'http://127.0.0.1:8788' }));

const TEST_URL =
  'https://www.xiaohongshu.com/explore/6a7f18fb000000002800bec7' +
  '?xsec_token=ABbc7OfSrpWYZqhrSML47egc7Y8kqwP2Q9XsGHIsRdydA%3D&xsec_source=pc_feed';

const stubBrowserGlobals = (fetcher: typeof fetch) => {
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('localStorage', {
    getItem: () => '',
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getXhsImageUrls', () => {
  it('propagates the API error instead of reading images from an error response', async () => {
    const fetcher: typeof fetch = async () => {
      return new Response(JSON.stringify({ error: 'XHS returned 500' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    stubBrowserGlobals(fetcher);

    await expect(getXhsImageUrls(TEST_URL)).rejects.toThrow('XHS returned 500');
  });

  it('returns an empty array for a successful response without images', async () => {
    const fetcher: typeof fetch = async () => {
      return new Response(JSON.stringify({ images: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    stubBrowserGlobals(fetcher);

    await expect(getXhsImageUrls(TEST_URL)).resolves.toEqual([]);
  });
});
