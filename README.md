# KKSetu - Netlify Image Gallery SPA

A serverless image gallery built with React, TypeScript, and Netlify.

## Features

- **Upload Images**: Upload images with metadata (rating, character tags) via secure API
- **Browse Images**: View images in a grid with filtering by rating and character tags
- **Image Lightbox**: Click images to view in full-screen overlay
- **Legacy Support**: Preserve existing TXT file extraction feature for backward compatibility
- **Serverless Architecture**: Built on Netlify Functions and Netlify DB (PostgreSQL powered by Neon)

## Tech Stack

- **Frontend**: React 19, TypeScript, React Router DOM, TanStack Query
- **Styling**: Plain CSS
- **Backend**: Netlify Functions (TypeScript)
- **Database**: Netlify DB (Serverless PostgreSQL)
- **Image Storage**: Netlify Blobs
- **Build**: Webpack

## Routes

- `/` - Image gallery grid for browsing uploaded images
- `/upload` - Upload form with metadata (new feature)
- `/extract` - Legacy TXT file image extraction (backward compatibility)

## Project Structure

```
src/
├── components/
│ ├── App.tsx # Main app component with router
│ ├── MainContent.tsx # Routes and query provider
│ ├── Header.tsx # App header
│ ├── TabBar.tsx # Navigation tabs
│ ├── ImageGridPage.tsx # Image gallery grid
│ ├── UploadPage.tsx # New upload form with metadata
│ ├── ExtractPage.tsx # Legacy TXT extractor
│ ├── UploadSection.tsx # Legacy upload UI
│ ├── ImageContainer.tsx # Legacy image display
│ ├── ImageThumbnail.tsx # Image cards
│ └── ImageLightbox.tsx # Full-screen image viewer
├── types/
│ └── index.ts # TypeScript interfaces
├── utils/
│ ├── constants.ts # Base URL configuration
│ └── db.ts # Database operations for Netlify DB
├── hooks/
│ └── useProjectId.ts # Project ID query hook
└── styles/ # CSS files

netlify/functions/
├── upload.ts # POST /api/upload - Upload images
├── images.ts # GET /api/images - Fetch images
└── project-id.js # GET project ID
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Netlify DB

Netlify DB is a serverless PostgreSQL database powered by Neon. To set it up:

1. **Install the Netlify CLI** (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Link your project**:
   ```bash
   netlify link
   ```

4. **Initialize Netlify DB**:
   ```bash
   npx netlify db init
   ```

5. **This will**:
   - Install `@netlify/neon` package
   - Create a database instance
   - Generate a connection string

6. **The database schema will be automatically created** on first use by the `initializeDatabase()` function in `src/utils/db.ts`

### 3. Configure Environment Variables

Add the following environment variables in your Netlify project settings (via Netlify Dashboard or CLI):

- **UPLOAD_SECRET_KEY**: Secret key for authenticating upload requests (required for uploads)
  - Generate a strong random string
  - Set in Netlify: `netlify env:set UPLOAD_SECRET_KEY "your-secret-key-here"`

### 4. Set Up Netlify Blobs

Create a blob store called `imageStore`:

```bash
# No manual setup needed - the store is created automatically in the code
# Netlify Blobs are serverless and created on first use
```

### 5. Development

```bash
# Start development server
npm start

# Or
npm run dev
```

Server will start at http://localhost:3000

### 6. Build for Production

```bash
npm run build
```

### 7. Deploy to Netlify

```bash
# Deploy to production
netlify deploy --prod

# Or use the build command which deploys automatically
npm run build && netlify deploy --prod
```

## API Endpoints

### POST /api/upload

Upload a new image with metadata.

**Authentication:** Requires `UPLOAD_SECRET_KEY` environment variable

**Request:**
```typescript
FormData:
- image: File (required)
- rating: "safe" | "nsfw" (required)
- character: string (comma-separated tags, optional)
- secretKey: string (required, must match UPLOAD_SECRET_KEY)
```

**Response:**
```typescript
{
  id: string;
  rating: "safe" | "nsfw";
  character: string[];
  originalFilename: string;
  contentType: string;
  uploadedAt: string; // ISO timestamp
}
```

### GET /api/images

Fetch paginated and filtered images.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `rating?`: "safe" | "nsfw" (optional filter)
- `characters?`: string (comma-separated, optional filter)

**Response:**
```typescript
{
  data: Array<{
    id: string;
    rating: "safe" | "nsfw";
    character: string[];
    url: string; // Signed URL
    originalFilename: string;
    contentType: string;
    uploadedAt: string;
  }>;
  pageInfo: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}
```

## Metadata Structure

```typescript
interface Metadata {
  id: string;                // Unique UUID
  rating: "safe" | "nsfw";   // Content rating
  character: string[];       // Array of character tags
  originalFilename: string;  // Original file name
  contentType: string;       // MIME type
  uploadedAt: string;        // ISO timestamp
}
```

## Important Notes

1. **Database Initialization**: The database schema is created automatically on first use. No manual migration needed.

2. **Character Filtering**: The API uses OR logic for character tags - images matching any of the specified characters will be returned.

3. **Image URLs**: Images are served via signed URLs from Netlify Blobs, not directly. These URLs expire automatically.

4. **CORS**: All API endpoints include CORS headers for cross-origin requests.

5. **Pagination**: Use `page` and `limit` query parameters to paginate results. The response includes pagination metadata.

6. **Infinite Scroll**: The frontend uses TanStack Query's `useInfiniteQuery` for infinite scrolling support.

## Database Operations

The `src/utils/db.ts` file provides the following operations:

- `initializeDatabase()`: Creates tables and indexes if they don't exist
- `insertImageMetadata(metadata)`: Inserts a new image's metadata
- `getImages(page, limit, rating?, characters?)`: Fetches paginated and filtered images
- `getImageById(id)`: Fetches a single image by ID

## Legacy Feature

The `/extract` route preserves the original TXT file image extraction functionality for backward compatibility. This feature:
- Reads base64-encoded images from TXT files
- Displays images using data URLs (no server storage)
- Runs entirely client-side

## Troubleshooting

### Database Connection Issues

If you see errors connecting to Netlify DB:
1. Ensure you've run `npx netlify db init`
2. Check that your Netlify site is properly linked: `netlify link`
3. Verify database connection in Netlify dashboard
4. Check that `@netlify/neon` is installed: `npm list @netlify/neon`

### Upload Secret Key Error

If uploads fail with "Unauthorized":
1. Set the `UPLOAD_SECRET_KEY` environment variable in Netlify
2. Ensure the key you're sending in the form matches exactly
3. Check the browser Network tab for the actual error response

### Build Errors

If TypeScript compilation fails:
1. Check `tsconfig.json` configuration
2. Ensure all dependencies are installed: `npm install`
3. Verify webpack configuration includes `.ts` and `.tsx` extensions
4. Check for type errors: `npx tsc --noEmit`

### Image Upload Issues

If image uploads fail:
1. Verify the image file is not too large (Netlify Functions have size limits)
2. Check that the image MIME type is allowed
3. Ensure Netlify Blobs are enabled on your account
4. Check function logs: `netlify functions:log`

## Development Notes

- All components are written in TypeScript
- React hooks are used for state management
- TanStack Query (react-query) handles server state
- Netlify Functions run in serverless environment
- Images are stored in Netlify Blobs (S3-compatible storage)

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## License

ISC
