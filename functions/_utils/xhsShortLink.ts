const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ALLOWED_HOSTS = new Set([
  'xhslink.com',
  'xhslink.cn',
  'xiaohongshu.com',
  'www.xiaohongshu.com',
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 10;

const validateUrl = (url: URL): void => {
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !ALLOWED_HOSTS.has(url.hostname) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error('Invalid short link redirect destination');
  }
};

export const parseXhsShortLink = async (
  content: string,
  fetcher: typeof fetch = fetch
): Promise<string> => {
  const match = content.match(/https?:\/\/xhslink\.(?:com|cn)\/[a-zA-Z0-9\/]+/);
  if (!match) throw new Error('No short link found in content');

  let currentUrl = new URL(match[0]);
  const visited = new Set<string>();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    validateUrl(currentUrl);
    if (visited.has(currentUrl.href)) throw new Error('Short link redirect loop');
    visited.add(currentUrl.href);

    const isXhsPage =
      currentUrl.hostname === 'xiaohongshu.com' ||
      currentUrl.hostname === 'www.xiaohongshu.com';

    // Stop before requesting the note page: the upstream may redirect cloud IPs to login.
    if (
      isXhsPage &&
      /^\/(?:explore|discovery\/item|user\/profile)\/[a-z0-9]+\/?$/i.test(currentUrl.pathname) &&
      currentUrl.searchParams.get('xsec_token')
    ) {
      return currentUrl.href;
    }

    if (hop === MAX_REDIRECTS) break;

    if (isXhsPage && /^\/login\/?$/.test(currentUrl.pathname)) {
      const redirectPath = currentUrl.searchParams.get('redirectPath');
      if (!redirectPath) throw new Error('Login redirect is missing the note URL');
      // URLSearchParams decodes the outer value once, preserving the note's encoded token.
      currentUrl = new URL(redirectPath, currentUrl);
      continue;
    }

    const response = await fetcher(currentUrl.href, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': FALLBACK_UA,
        Referer: 'https://www.xiaohongshu.com/',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    const location = response.headers.get('Location');
    await response.body?.cancel();
    if (!REDIRECT_STATUSES.has(response.status) || !location) {
      throw new Error('Short link did not resolve to a note URL');
    }
    currentUrl = new URL(location, currentUrl);
  }

  throw new Error('Too many short link redirects');
};
