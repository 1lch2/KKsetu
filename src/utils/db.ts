import { neon } from '@netlify/neon';
import { Metadata, DatabaseImageRow } from '../types';

// Initialize the database client
export const db = neon();

/**
 * Initialize the database schema if it doesn't exist
 */
export async function initializeDatabase() {
  try {
    await db`
      CREATE TABLE IF NOT EXISTS images (
        id VARCHAR(36) PRIMARY KEY,
        rating VARCHAR(10) NOT NULL CHECK (rating IN ('safe', 'nsfw')),
        characters TEXT NOT NULL, -- Store as JSON array string
        original_filename VARCHAR(255) NOT NULL,
        content_type VARCHAR(100) NOT NULL,
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index for better query performance
    await db`
      CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images(uploaded_at DESC)
    `;

    await db`
      CREATE INDEX IF NOT EXISTS idx_images_rating ON images(rating)
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Insert metadata for a new image
 */
export async function insertImageMetadata(metadata: Metadata): Promise<void> {
  await db`
    INSERT INTO images (
      id,
      rating,
      characters,
      original_filename,
      content_type,
      uploaded_at
    ) VALUES (
      ${metadata.id},
      ${metadata.rating},
      ${JSON.stringify(metadata.character)},
      ${metadata.originalFilename},
      ${metadata.contentType},
      ${metadata.uploadedAt}
    )
  `;
}

/**
 * Fetch paginated and filtered images
 */
export async function getImages(
  page: number = 1,
  limit: number = 20,
  rating?: 'safe' | 'nsfw',
  characters?: string[]
): Promise<{
  data: Metadata[];
  pageInfo: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}> {
  const offset = (page - 1) * limit;

  // Get all images and filter in JavaScript (simpler approach)
  // In production, you'd want to do this in SQL for performance
  let data: DatabaseImageRow[];

  if (rating) {
    data = await db`
      SELECT
        id,
        rating,
        characters,
        original_filename as "originalFilename",
        content_type as "contentType",
        uploaded_at as "uploadedAt"
      FROM images
      WHERE rating = ${rating}
      ORDER BY uploaded_at DESC
    ` as DatabaseImageRow[];
  } else {
    data = await db`
      SELECT
        id,
        rating,
        characters,
        original_filename as "originalFilename",
        content_type as "contentType",
        uploaded_at as "uploadedAt"
      FROM images
      ORDER BY uploaded_at DESC
    ` as DatabaseImageRow[];
  }

  // Filter by characters if provided
  let filteredData = data;
  if (characters && characters.length > 0) {
    filteredData = data.filter(row => {
      const rowCharacters = JSON.parse(row.characters) as string[];
      // Check if any of the filter characters match any character in the row
      return characters.some(char => rowCharacters.some(rowChar =>
        rowChar.toLowerCase().includes(char.toLowerCase())
      ));
    });
  }

  // Calculate pagination
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedData = filteredData.slice(offset, offset + limit);

  // Parse the characters JSON string back to array
  const parsedData = paginatedData.map((row) => ({
    id: row.id,
    rating: row.rating,
    character: JSON.parse(row.characters),
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    uploadedAt: row.uploadedAt,
  }));

  return {
    data: parsedData,
    pageInfo: {
      currentPage: page,
      totalPages,
      totalItems: Number(totalItems),
    },
  };
}

/**
 * Get a single image by ID
 */
export async function getImageById(id: string): Promise<Metadata | null> {
  const result = await db`
    SELECT
      id,
      rating,
      characters,
      original_filename as "originalFilename",
      content_type as "contentType",
      uploaded_at as "uploadedAt"
    FROM images
    WHERE id = ${id}
  `;

  if (result.length === 0) {
    return null;
  }

  const row = result[0] as DatabaseImageRow;
  return {
    id: row.id,
    rating: row.rating,
    character: JSON.parse(row.characters),
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    uploadedAt: row.uploadedAt,
  };
}
