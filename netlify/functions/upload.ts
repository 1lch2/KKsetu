import type { Context } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';
import { getStore } from '@netlify/blobs';
import { db, initializeDatabase, insertImageMetadata } from '../../src/utils/db';

// Initialize database connection
let dbInitialized = false;

export default async (req: Request, context: Context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Parse the multipart form data
    const formData = await req.formData();

    // Extract fields
    const image = formData.get('image') as File;
    const rating = formData.get('rating') as string;
    const character = formData.get('character') as string;
    const secretKey = formData.get('secretKey') as string;

    // Validate required fields
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image file is required' }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!rating || !['safe', 'nsfw'].includes(rating)) {
      return new Response(
        JSON.stringify({ error: 'Valid rating (safe/nsfw) is required' }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: 'Secret key is required' }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    // Authentication
    const uploadSecretKey = process.env.UPLOAD_SECRET_KEY;
    if (!uploadSecretKey || secretKey !== uploadSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid secret key' }),
        {
          status: 401,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process character tags
    const characterTags = character
      ? character.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
      : [];

    // Convert image to buffer
    const imageBuffer = Buffer.from(await image.arrayBuffer());

    // Generate unique ID
    const id = uuidv4();

    // Get the image store
    const store = getStore('imageStore');

    // Save image to blobs
    await store.set(id, imageBuffer, {
      metadata: { contentType: image.type },
    });

    // Create metadata object
    const metadata = {
      id,
      rating: rating as 'safe' | 'nsfw',
      character: characterTags,
      originalFilename: image.name,
      contentType: image.type,
      uploadedAt: new Date().toISOString(),
    };

    // Save metadata to database
    await insertImageMetadata(metadata);

    // Return success response
    return new Response(
      JSON.stringify(metadata),
      {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Upload failed', details: error.message }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  }
};

// Need to install uuid dependency
// npm install uuid
// npm install @types/uuid --save-dev
