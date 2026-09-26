import { afterEach, describe, expect, it, vi } from 'vitest';

import { transformImage, type TransformDirection } from '../src/utils/imageObfuscation';

class MockImage {
  naturalWidth = 2;
  naturalHeight = 2;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    this.onload?.();
  }
}

class MockImageData {
  data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

const transformWithCanvasMock = async (
  direction: TransformDirection,
  outputType: string | null = 'image/png'
) => {
  let encoding: { mimeType: string | undefined; quality: number | undefined } | undefined;
  const sourceData = new MockImageData(2, 2);
  sourceData.data.set([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 10, 20, 30, 255]);
  const originalPixels = sourceData.data.slice();
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => sourceData),
    putImageData: vi.fn((data: MockImageData) => sourceData.data.set(data.data)),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: (
      callback: (blob: Blob | null) => void,
      requestedMimeType?: string,
      quality?: number
    ) => {
      encoding = { mimeType: requestedMimeType, quality };
      callback(outputType === null ? null : new Blob([], { type: outputType }));
    },
  };

  vi.stubGlobal('Image', MockImage);
  vi.stubGlobal('ImageData', MockImageData);
  vi.stubGlobal('document', {
    createElement: vi.fn(() => canvas),
  });

  const result = await transformImage('blob:source', direction);
  const transformedPixels = sourceData.data.slice();
  await transformImage('blob:result', direction === 'encrypt' ? 'decrypt' : 'encrypt');
  return { encoding, result, originalPixels, transformedPixels, restoredPixels: sourceData.data };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('transformImage', () => {
  it.each(['encrypt', 'decrypt'] as const)(
    'exports %s as PNG and preserves inverse pixel mapping',
    async (direction) => {
      const { encoding, result, originalPixels, transformedPixels, restoredPixels } =
        await transformWithCanvasMock(direction);
      expect(encoding).toEqual({
        mimeType: 'image/png',
        quality: undefined,
      });
      expect(result.type).toBe('image/png');
      expect(transformedPixels).not.toEqual(originalPixels);
      expect(restoredPixels).toEqual(originalPixels);
    }
  );

  it('rejects a failed canvas export', async () => {
    await expect(transformWithCanvasMock('encrypt', null)).rejects.toThrow('无法生成处理后的图片');
  });

  it('rejects a non-PNG result', async () => {
    await expect(transformWithCanvasMock('encrypt', 'image/webp')).rejects.toThrow(
      '无法生成 PNG 格式的图片'
    );
  });
});
