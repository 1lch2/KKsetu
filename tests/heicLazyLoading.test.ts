import { afterEach, expect, it, vi } from 'vitest';

import { getXhsImages } from '../src/hooks/useGetXhsImages';

const { convertHeic, loadHeic } = vi.hoisted(() => ({
  convertHeic: vi.fn(),
  loadHeic: vi.fn(),
}));

vi.mock('heic2any', () => {
  loadHeic();
  return { default: convertHeic };
});
vi.mock('../src/utils/constants', () => ({ BASE_URL: 'http://127.0.0.1:8788' }));

afterEach(() => {
  vi.unstubAllGlobals();
});

it('loads the decoder only when an image needs HEIC conversion', async () => {
  const postUrl =
    'https://www.xiaohongshu.com/explore/6a7f18fb000000002800bec7?xsec_token=test';
  const imageUrl = 'https://sns-img-qc.xhscdn.com/test-image';
  let contentType = 'image/jpeg';
  const fetcher: typeof fetch = async (input) => {
    if (String(input).endsWith('/api/fetchXhsImageUrls')) {
      return Response.json({ images: [imageUrl] });
    }
    return new Response('image bytes', { headers: { 'Content-Type': contentType } });
  };
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('localStorage', { getItem: () => '' });

  const regularImages = await getXhsImages(postUrl);
  expect(regularImages.failedCount).toBe(0);
  expect(regularImages.images).toHaveLength(1);
  expect(regularImages.images[0].type).toBe('image/jpeg');
  expect(loadHeic).not.toHaveBeenCalled();
  expect(convertHeic).not.toHaveBeenCalled();

  const pngBlob = new Blob(['converted image'], { type: 'image/png' });
  for (const mimeType of ['image/heic', 'image/heif']) {
    contentType = mimeType;
    convertHeic.mockResolvedValueOnce(mimeType === 'image/heic' ? pngBlob : [pngBlob]);

    await expect(getXhsImages(postUrl)).resolves.toEqual({ images: [pngBlob], failedCount: 0 });
    expect(convertHeic).toHaveBeenLastCalledWith({
      blob: expect.any(Blob),
      toType: 'image/png',
    });
  }
  expect(loadHeic).toHaveBeenCalledTimes(1);

  convertHeic.mockRejectedValueOnce(new Error('HEIC decode failed'));
  await expect(getXhsImages(postUrl)).rejects.toThrow('图片格式转换失败');
});
