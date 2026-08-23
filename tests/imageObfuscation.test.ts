import { afterEach, describe, expect, it, vi } from 'vitest';

import { transformImage } from '../src/utils/imageObfuscation';

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

const transformWithCanvasMock = async (mimeType: string) => {
  let encoding: { mimeType: string | undefined; quality: number | undefined } | undefined;
  const sourceData = new MockImageData(2, 2);
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => sourceData),
    putImageData: vi.fn(),
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
      callback(new Blob([], { type: requestedMimeType }));
    },
  };

  vi.stubGlobal('Image', MockImage);
  vi.stubGlobal('ImageData', MockImageData);
  vi.stubGlobal('document', {
    createElement: vi.fn(() => canvas),
  });

  await transformImage('blob:source', 'encrypt', mimeType);
  return encoding;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('transformImage', () => {
  it('requests lossless WebP encoding so the inverse transform keeps exact pixels', async () => {
    await expect(transformWithCanvasMock('image/webp')).resolves.toEqual({
      mimeType: 'image/webp',
      quality: 1,
    });
  });

  it('does not add a quality setting to lossless PNG encoding', async () => {
    await expect(transformWithCanvasMock('image/png')).resolves.toEqual({
      mimeType: 'image/png',
      quality: undefined,
    });
  });
});
