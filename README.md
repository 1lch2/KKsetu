# KKSetu

A serverless image extraction tool built with React, TypeScript, and Cloudflare Pages Functions.
Extract original-quality images from Xiaohongshu (小红书) posts, or read base64-encoded images from
TXT files.

## Features

- **Xiaohongshu Extraction**: Extract original-quality images from Xiaohongshu posts via share
  content, full URLs, or `xhslink.com` short links
- **HEIC Conversion**: Automatically detects HEIC/HEIF images and converts them to PNG in the browser
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
- `/extract` - TXT file image extraction (提取TXT)

## Project Structure

```
src/
├── App.tsx                              # Root component: Router + Header + MainContent
├── index.js                             # Entry point
├── components/
│   ├── Header/Header.tsx                # App header
│   ├── TabBar/TabBar.tsx                # Navigation tabs
│   ├── TabPanel/TabPanel.tsx            # Renders children when the path matches
│   ├── MainContent/MainContent.tsx      # Routes + QueryClientProvider
│   ├── ExtractPage/                     # TXT image extraction
│   │   ├── ExtractPage.tsx
│   │   └── __internal__/UploadSection/UploadSection.tsx
│   ├── XiaohongshuExtractPage/          # Xiaohongshu image extraction
│   │   ├── XiaohongshuExtractPage.tsx
│   │   └── __internal__/CookieDialog.tsx   # Cookie input dialog
│   └── ImageContainer/                  # Shared image grid + fullscreen viewer
│       ├── ImageContainer.tsx
│       └── __internal__/FullscreenOverlay.tsx
├── hooks/
│   ├── useGetXhsImages.ts               # Fetches & processes XHS images (TanStack Query)
│   └── useProjectId.ts                  # Legacy project-id hook (currently unused)
├── types/
│   └── index.ts                         # TypeScript interfaces
├── utils/
│   └── constants.ts                     # BASE_URL configuration
└── styles/                              # CSS files

functions/
├── types.d.ts
├── tsconfig.json
├── _utils/
│   └── convertUa.ts                     # User-Agent helpers
└── api/
    ├── parseXhsShort.ts                 # Resolve xhslink.com short links
    ├── fetchXhsImageUrls.ts             # Fetch the image URL list for a post
    └── getXhsSourceImage.ts             # Proxy image binary (CORS bypass + HEIC detection)
```

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

### 4. Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy
```

## API Endpoints

All endpoints are Cloudflare Pages Functions under `/api`.

- `GET /api/parseXhsShort?content=<share text>`
  Resolves an `xhslink.com` short link to the full `xiaohongshu.com` URL.
  Response: `{ "fullLink": string }`

- `POST /api/fetchXhsImageUrls`
  Fetches the post page server-side, extracts `window.__INITIAL_STATE__`, and returns
  original-quality image URLs.
  Body: `{ "postId": string, "xsecToken": string, "cookie"?: string }`
  Response: `{ "images": string[], "title": string }`

- `GET /api/getXhsSourceImage?url=<image url>`
  Proxies the image binary to bypass CDN CORS restrictions. The response `Content-Type` is used
  client-side to detect HEIC/HEIF images.

## How Xiaohongshu Extraction Works

1. The pasted share content is parsed: `xhslink.com` short links are resolved via
   `/api/parseXhsShort`, then `postId` and `xsec_token` are extracted from the resulting URL.
2. `POST /api/fetchXhsImageUrls` requests the post page server-side (with a PC User-Agent and the
   user-provided cookie, if any) and pulls original image URLs out of the embedded
   `__INITIAL_STATE__`.
3. Each image is loaded through `/api/getXhsSourceImage` to bypass the CDN's CORS policy. If the
   response is HEIC/HEIF, it is converted to PNG in the browser via `heic2any`.

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

ISC
