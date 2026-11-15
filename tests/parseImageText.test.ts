import { describe, expect, it } from 'vitest';

import { parseImageText } from '../src/pages/ExtractPage/__internal__/parseImageText';

describe('parseImageText', () => {
  it('preserves image data URLs and legacy Base64 with file whitespace', () => {
    expect(parseImageText('\uFEFF data:image/jpeg;base64,/9j/\n2Q==\r\n')).toBe(
      'data:image/jpeg;base64,/9j/2Q=='
    );
    expect(parseImageText('iVBORw0KGgo=\n')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(parseImageText('data:image/webp;base64,YWJj')).toBe('data:image/webp;base64,YWJj');
  });

  it.each([
    '',
    'data:image/png;base64,AAAA" onerror="parent.alert(1)',
    'data:image/png;base64,AAAA"><script>parent.alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml,<svg onload="alert(1)"/>',
    'https://example.com/image.png',
    'javascript:alert(1)',
    'data:image/png;base64,A',
    'data:image/png;base64,AA=A',
    'data:image/png;base64,AAAA=',
  ])('rejects HTML, non-image URLs and malformed Base64: %s', (input) => {
    expect(parseImageText(input)).toBeNull();
  });
});
