# KKSetu - Cloudflare Image Gallery SPA

A serverless image gallery built with React, TypeScript, and Cloudflare Workers.

## Features

- **Legacy Support**: Preserve existing TXT file extraction feature for backward compatibility
- **Serverless Architecture**: Built on Cloudflare Workers and Cloudflare D1 (SQLite)
- **XiaoHongShu Support**: Extract images from Xiaohongshu (小红书) posts

## Tech Stack

- **Frontend**: React 19, TypeScript, React Router DOM, TanStack Query
- **Styling**: Plain CSS
- **Backend**: Cloudflare Workers (Pages Functions)
- **Build**: Webpack

## Routes

- `/` - Legacy TXT file image extraction (backward compatibility)
- `/convert` - Prompt converter for WebUI and NAI prompt formats
- `/xiaohongshu` - Extract images from Xiaohongshu posts

## Project Structure

```
src/
├── App.tsx # Main app component with router
├── index.js # Entry point
├── components/
│   ├── Header/Header.tsx # App header
│   ├── TabBar/TabBar.tsx # Navigation tabs
│   ├── MainContent/MainContent.tsx # Routes and query provider
│   ├── ExtractPage/ExtractPage.tsx # Legacy TXT extractor
│   │   ├── __internal__/UploadSection/UploadSection.tsx # Legacy upload UI
│   │   └── __internal__/ImageContainer/ImageContainer.tsx # Legacy image display
│   └── XiaohongshuExtractPage/ # Xiaohongshu post image extractor
├── types/
│   └── index.ts # TypeScript interfaces
├── utils/
│   ├── constants.ts # Base URL configuration
│   ├── db.ts # Database operations for Cloudflare D1
│   ├── xiaohongshuExtract.ts # Xiaohongshu data extraction utilities
│   └── promptConvert.ts # Prompt conversion utilities
├── hooks/
│   └── useProjectId.ts # Project ID query hook
└── styles/ # CSS files

functions/api/
├── fetch-xhs.ts # Cloudflare Pages Function for Xiaohongshu extraction
└── (other Cloudflare Workers functions)

```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Development

```bash
# Start development server
npm start
# or
npm run dev
```

Server will start at http://localhost:3000

### 3. Build for Production

```bash
npm run build
```

### 4. Deploy to Cloudflare

```bash
# Deploy Workers
wrangler deploy

# Or deploy to Cloudflare Pages
npx wrangler pages deploy
```

> **Note**: Database and storage setup instructions are for future WIP features. Current version
> runs entirely client-side and doesn't require backend configuration.

## API Endpoints

### Cloudflare Workers Functions

- `GET /api/fetch-xhs` - Extract images from Xiaohongshu posts
  - Query parameters: `postId`, `xsecToken`

> **Note**: Image upload and browsing APIs are currently WIP and not active in the current version.

## Important Notes

- The application currently focuses on legacy TXT file extraction and prompt conversion features
- Serverless database and storage features are prepared but not yet integrated into the active UI

### Legacy TXT Extraction

The `/` route preserves the original TXT file image extraction functionality for backward
compatibility. This feature:

- Reads base64-encoded images from TXT files
- Displays images using data URLs (no server storage)
- Runs entirely client-side

### Xiaohongshu Extraction

The `/xiaohongshu` route provides image extraction from Xiaohongshu posts:

- Input: Xiaohongshu post URL or post ID
- Output: Extracted images in original quality
- Uses server-side rendering to bypass CORS restrictions

## Troubleshooting

### Build Errors

If TypeScript compilation fails:

1. Check `tsconfig.json` configuration
2. Ensure all dependencies are installed: `npm install`
3. Verify webpack configuration includes `.ts` and `.tsx` extensions
4. Check for type errors: `npx tsc --noEmit`

### Cloudflare Deployment Issues

If Cloudflare Workers deployment fails:

1. Ensure `wrangler` is installed: `npm install -D wrangler`
2. Check `wrangler.toml` configuration
3. Verify Cloudflare account is linked: `wrangler login`

## Development Notes

- All components are written in TypeScript
- React hooks are used for state management
- Project structure uses component subdirectories with internal components in `__internal__` folders
- Webpack aliases configured for clean imports (`@components`, `@utils`, etc.)

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## License

ISC
