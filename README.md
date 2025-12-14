# KKSetu - Netlify Image Gallery SPA

A serverless image gallery built with React, TypeScript, and Netlify.

## Features

- **Legacy Support**: Preserve existing TXT file extraction feature for backward compatibility
- **Serverless Architecture**: Built on Netlify Functions and Netlify DB (PostgreSQL powered by
  Neon)

## Tech Stack

- **Frontend**: React 19, TypeScript, React Router DOM, TanStack Query
- **Styling**: Plain CSS
- **Backend**: Netlify Functions (TypeScript)
- **Database**: Netlify DB (Serverless PostgreSQL)
- **Image Storage**: Netlify Blobs
- **Build**: Webpack

## Routes

- `/` - Legacy TXT file image extraction (backward compatibility)
- `/convert` - Prompt converter for WebUI and NAI prompt formats

## Project Structure

```
src/
├── App.tsx # Main app component with router
├── index.js # Entry point
├── components/
│   ├── Header/Header.tsx # App header
│   ├── TabBar/TabBar.tsx # Navigation tabs
│   ├── MainContent/MainContent.tsx # Routes and query provider
│   └── ExtractPage/ExtractPage.tsx # Legacy TXT extractor
│       ├── __internal__/UploadSection/UploadSection.tsx # Legacy upload UI
│       └── __internal__/ImageContainer/ImageContainer.tsx # Legacy image display
├── types/
│   └── index.ts # TypeScript interfaces
├── utils/
│   ├── constants.ts # Base URL configuration
│   ├── db.ts # Database operations for Netlify DB
│   └── promptConvert.ts # Prompt conversion utilities
├── hooks/
│   └── useProjectId.ts # Project ID query hook
└── styles/ # CSS files

netlify/functions/
├── upload.ts # POST /api/upload - Upload images (WIP)
├── images.ts # GET /api/images - Fetch images (WIP)
└── project-id.js # GET project ID
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

### 4. Deploy to Netlify

```bash
# Deploy to production
netlify deploy --prod
```

> **Note**: Database and storage setup instructions are for future WIP features. Current version
> runs entirely client-side and doesn't require backend configuration.

## API Endpoints

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

## Troubleshooting

### Build Errors

If TypeScript compilation fails:

1. Check `tsconfig.json` configuration
2. Ensure all dependencies are installed: `npm install`
3. Verify webpack configuration includes `.ts` and `.tsx` extensions
4. Check for type errors: `npx tsc --noEmit`

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
