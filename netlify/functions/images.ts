import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { db, initializeDatabase, getImages } from '../../src/utils/db';

// Initialize database connection
let dbInitialized = false;

export default async (req: Request, context: Context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Ensure database is initialized
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return new Response(
        JSON.stringify({ error: 'Database initialization failed' }),
        {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const rating = url.searchParams.get('rating') as 'safe' | 'nsfw' | null;
    const charactersParam = url.searchParams.get('characters');

    const characters = charactersParam
      ? charactersParam.split(',').map((char) => char.trim()).filter((char) => char.length > 0)
      : undefined;

    // Validate parameters
    if (isNaN(page) || page < 1) {
      return new Response(JSON.stringify({ error: 'Invalid page parameter' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return new Response(JSON.stringify({ error: 'Invalid limit parameter (max 100)' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Fetch paginated metadata from database
    const { data: metadata, pageInfo } = await getImages(page, limit, rating || undefined, characters);

    // Generate signed URLs for each image
    const store = getStore('imageStore');
    const imagesWithUrls = await Promise.all(
      metadata.map(async (meta) => {
        const url = await store.getSignedURL(meta.id);
        return {
          id: meta.id,
          rating: meta.rating,
          character: meta.character,
          url,
          originalFilename: meta.originalFilename,
          contentType: meta.contentType,
          uploadedAt: meta.uploadedAt,
        };
      })
    );

    // Return the response
    return new Response(
      JSON.stringify({
        data: imagesWithUrls,
        pageInfo,
      }),
      {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching images:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch images', details: error.message }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  }
};
