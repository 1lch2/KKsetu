# KKSetu

A serverless image extraction tool built with React, TypeScript, and Cloudflare Pages Functions.
Extract original-quality images from Xiaohongshu (小红书) and public Skland (森空岛) posts, or read
base64-encoded images from TXT files.

## Features

- **Xiaohongshu Extraction**: Extract original-quality images from Xiaohongshu posts via share
  content, full URLs, or `xhslink.com` short links
- **Skland Extraction**: Extract static original images from public `skland.com` article URLs
- **HEIC Conversion**: Automatically detects HEIC/HEIF images and converts them to PNG in the
  browser
- **Cookie Support**: Optionally provide a Xiaohongshu cookie for posts that require authentication
- **TXT Extraction**: Legacy tool that reads base64-encoded images from TXT files (runs entirely
  client-side)
- **Fullscreen Viewer**: Click any extracted image to view it in a fullscreen overlay

## Tech Stack

- **Frontend**: React 19, TypeScript, React Router DOM, TanStack Query
- **Styling**: Plain CSS
- **Backend**: Cloudflare Pages Functions
- **Build**: Webpack

## Routes

- `/` - Xiaohongshu original image extraction (提取小红书原图)
- `/skland` - Skland public-post original image extraction (提取森空岛原图)
- `/obfuscate` - Local image obfuscation (图片混淆)
- `/extract` - TXT file image extraction (提取TXT)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Development

Two dev servers are available and are **not** interchangeable:

```bash
# Frontend only (webpack-dev-server), served at http://localhost:3000
# Pages Functions are NOT served here, so Xiaohongshu API calls will fail.
# Use this only for UI work or the client-side TXT extractor.
npm start
```

```bash
# Frontend + Pages Functions (wrangler pages dev), default http://localhost:8788
# Serves both the UI and the functions/ endpoints — use this for the full flow.
npm run dev
```

### 3. Build for Production

```bash
npm run build
```

### 4. Test

```bash
npm test -- --run
```

Live Skland tests are opt-in and call four fixed public posts. In PowerShell:

```powershell
$env:RUN_SKLAND_LIVE_TESTS='1'
npm test -- --run tests/skland.live.test.ts
```

### 5. Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy
```

Before exposing the endpoint publicly, configure a Cloudflare rate-limit rule for
`/api/fetchSklandImageUrls` based on the preview environment's observed latency and normal usage.

## API Endpoints

All endpoints are Cloudflare Pages Functions under `/api`.

- `GET /api/parseXhsShort?content=<share text>` Resolves an `xhslink.com` short link to the full
  `xiaohongshu.com` URL. Response: `{ "fullLink": string }`

- `POST /api/fetchXhsImageUrls` Fetches the post page server-side, extracts
  `window.__INITIAL_STATE__`, and returns original-quality image URLs. Body:
  `{ "postId": string, "xsecToken": string, "cookie"?: string }` Response:
  `{ "images": string[], "title": string }`

- `GET /api/getXhsSourceImage?url=<image url>` Proxies the image binary to bypass CDN CORS
  restrictions. The response `Content-Type` is used client-side to detect HEIC/HEIF images.

- `POST /api/fetchSklandImageUrls` Accepts one supported public Skland article URL and returns
  static original image URLs. Body: `{ "url": "https://www.skland.com/article?id=<id>" }` Response:
  `{ "articleId": string, "title"?: string, "images": string[] }`

## How Xiaohongshu Extraction Works

1. The pasted share content is parsed: `xhslink.com` short links are resolved via
   `/api/parseXhsShort`, then `postId` and `xsec_token` are extracted from the resulting URL.
2. `POST /api/fetchXhsImageUrls` requests the post page server-side (with a PC User-Agent and the
   user-provided cookie, if any) and pulls original image URLs out of the embedded
   `__INITIAL_STATE__`.
3. Each image is loaded through `/api/getXhsSourceImage` to bypass the CDN's CORS policy. If the
   response is HEIC/HEIF, it is converted to PNG in the browser via `heic2any`.

## How Skland Extraction Works

The Pages Function strictly parses the article ID and calls only fixed Shumei and Skland upstream
hosts. It creates a short-lived anonymous device ID, refreshes a request token, signs the article
request, then reads static images from `imageListSlice`. Query parameters are removed only from
`bbs.hycdn.cn` image URLs. Login, private content, video extraction, and bulk crawling are not
supported. The upstream protocol is not public and may change without notice.

## Troubleshooting

### Build Errors

If TypeScript compilation fails:

1. Check `tsconfig.json` configuration
2. Ensure all dependencies are installed: `npm install`
3. Verify webpack configuration includes `.ts` and `.tsx` extensions
4. Check for type errors: `npx tsc --noEmit`

### Cloudflare Deployment Issues

If Cloudflare Pages deployment fails:

1. Ensure `wrangler` is installed: `npm install -D wrangler`
2. Check the `wrangler.json` configuration
3. Verify your Cloudflare account is linked: `wrangler login`

## Development Notes

- All components are written in TypeScript
- TanStack Query is used for data fetching and request state
- Component subdirectories keep internal components under `__internal__/` folders
- Webpack aliases are configured for clean imports (`@components`, `@utils`, `@hooks`, `@styles`,
  `@types`, `@`)

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## License

KKSetu's original code is licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE). You
may use, modify, and distribute it only for noncommercial purposes. Commercial use is not permitted.

Third-party components remain under their respective licenses. The Skland protocol implementation
uses [`mima-kit`](https://github.com/RSoraM/mima-kit) 0.1.3 under the MIT License. See
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
