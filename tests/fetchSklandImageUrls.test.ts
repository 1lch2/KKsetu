import { describe, expect, it } from 'vitest';

import { handleSklandRequest } from '../functions/api/fetchSklandImageUrls';

describe('fetchSklandImageUrls API', () => {
  it('requires JSON content type', async () => {
    const response = await handleSklandRequest(
      new Request('https://example.com/api/fetchSklandImageUrls', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://www.skland.com/article?id=1' }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'INVALID_REQUEST', message: '请求内容无效' },
    });
  });

  it('rejects malformed JSON', async () => {
    const response = await handleSklandRequest(
      new Request('https://example.com/api/fetchSklandImageUrls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'INVALID_REQUEST', message: '请求内容无效' },
    });
  });

  it('rejects unsupported URLs before making upstream requests', async () => {
    const response = await handleSklandRequest(
      new Request('https://example.com/api/fetchSklandImageUrls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/article?id=1' }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'INVALID_SKLAND_URL', message: '请输入受支持的森空岛帖子链接' },
    });
  });
});
