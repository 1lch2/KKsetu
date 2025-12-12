export interface Metadata {
  /** A unique ID (e.g., UUID) linking to the image blob. */
  id: string;
  /** User-provided rating for the content. */
  rating: "safe" | "nsfw";
  /** A list of user-provided character tags. */
  character: string[];
  /** The original filename provided by the user. */
  originalFilename: string;
  /** The content type of the image (e.g., "image/png"). */
  contentType: string;
  /** ISO timestamp of the upload. */
  uploadedAt: string;
}

// Database row type - characters is stored as JSON string in DB
export interface DatabaseImageRow {
  id: string;
  rating: "safe" | "nsfw";
  characters: string; // JSON string in DB
  originalFilename: string;
  contentType: string;
  uploadedAt: string;
}

export interface ImageWithUrl extends Omit<Metadata, "character"> {
  character: string[];
  url: string;
}

export interface PaginatedImagesResponse {
  data: ImageWithUrl[];
  pageInfo: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface UploadFormData {
  image: File;
  rating: "safe" | "nsfw";
  character: string;
  secretKey: string;
}
