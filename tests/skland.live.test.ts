import { expect, it } from 'vitest';

import { extractSklandImages } from '../functions/_utils/skland';

const liveTest = process.env.RUN_SKLAND_LIVE_TESTS === '1' ? it : it.skip;

liveTest('extracts the known public Skland image post', async () => {
  const result = await extractSklandImages('https://www.skland.com/article?id=1913385');

  expect(result.articleId).toBe('1913385');
  expect(result.images).toHaveLength(5);
  expect(result.images.every((url) => !url.includes('?'))).toBe(true);
});

liveTest('accepts the h/detail URL format', async () => {
  const result = await extractSklandImages('https://www.skland.com/h/detail?id=611376');

  expect(result.articleId).toBe('611376');
});

liveTest('does not return video streams as images', async () => {
  const result = await extractSklandImages('https://www.skland.com/article?id=1957041');

  expect(result.images).toHaveLength(1);
  expect(result.images.every((url) => !url.includes('.m3u8'))).toBe(true);
});

liveTest('reports a missing public post', async () => {
  await expect(
    extractSklandImages('https://www.skland.com/article?id=999999999')
  ).rejects.toMatchObject({ code: 'ARTICLE_NOT_FOUND' });
});
