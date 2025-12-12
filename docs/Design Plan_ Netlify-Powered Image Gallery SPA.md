# **Design Plan: Netlify-Powered Image Gallery SPA**

This document outlines the architectural plan for a single-page application (SPA) that allows users to upload, view, and filter images. The entire application will be hosted on Netlify, leveraging Netlify Functions for the API layer and Netlify Blobs for all storage.

**Note:** This plan includes a legacy feature for backward compatibility with existing users - the TXT file image extraction functionality will be preserved as a separate tab.

## **1. Core Architectural Principles**

1. **Strict Abstraction:** The frontend React application will **never** interact with Netlify Blobs directly. All data access (uploading, fetching, metadata) must go through a dedicated API layer built with Netlify Functions. This ensures security and encapsulates storage logic.
2. **Centralized Metadata Index:** To provide server-side filtering and pagination, we cannot rely solely on listing blobs. We will maintain a single JSON file within the blob store, metadata-index.json, which acts as the "database." It will store an array of all Metadata objects.
3. **Atomic Updates:** All writes to metadata-index.json (e.g., adding a new image's metadata) **must** be atomic to prevent race conditions. This will be achieved by using the etag provided by the Netlify Blobs get and set methods for optimistic locking (a read-modify-write-check cycle).
4. **Data Model:**
   * **Blob Store:** "Default" store.
   * **Images:** Stored as individual blobs. The key will be a unique ID (e.g., a UUID).
   * **Metadata:** Stored in a single blob: key: "metadata-index.json", value: Metadata[].
5. **Signed URLs for Access:** The API will not serve image binaries directly. Instead, it will return Netlify Blob-generated [signed URLs](https://www.google.com/search?q=https://docs.netlify.com/blobs/read%23get-a-signed-url-for-a-blob) to the frontend. The frontend's <img> tags will use these URLs. This is far more performant and efficient.
6. **Legacy Feature Preservation:** The existing TXT file image extraction functionality will be maintained as a separate tab for backward compatibility with existing users. This feature operates independently without server-side storage.

## **2. Technical Stack**

* **Frontend:** React, TypeScript, react-router-dom, TanStack Query (react-query).  
* **Styling:** **Plain CSS** (for simple, clean styling).  
* **Backend:** Netlify Functions (TypeScript).  
* **Storage:** Netlify Blobs.  
* **Build/Deploy:** Netlify.

## **3. Metadata Structure**

As requested, all metadata will conform to this TypeScript interface. The id will be the unique key used to store the image blob.

```ts
interface Metadata {  
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
```

## **4. Netlify Functions (API Layer)**

All functions will reside in /netlify/functions/.

### **POST /api/upload**

* **Purpose:** Handles the upload of a new image and its metadata, protected by a secret key.  
* **Environment Variable:** Requires `UPLOAD_SECRET_KEY` to be set in the Netlify project settings.  
* **Input:** FormData (multipart/form-data).  
  * image: The image file.  
  * rating: String ("safe" or "nsfw").  
  * character: String (comma-separated list, e.g., "char1,char2").  
  * secretKey: The secret key provided by the user.  
* **Logic:**  
  1. Parse the FormData.  
  2. **Authentication:**  
     * Retrieve secretKey from the form data.  
     * Retrieve `UPLOAD_SECRET_KEY` from process.env.  
     * If secretKey !== process.env.`UPLOAD_SECRET_KEY` or the env var is not set, return 401 Unauthorized.  
  3. Generate a unique id (e.g., crypto.randomUUID()).  
  4. Get the image buffer and contentType from the file.  
  5. **Save Image:** await blobs.set(id, imageBuffer, { metadata: { contentType } }).  
  6. Update Metadata Index (Atomic):  
     a. Start a retry loop (for etag mismatch).  
     b. const { value: index, etag } = await blobs.get("metadata-index.json", { type: "json" }). Handle empty/non-existent index (initialize as []).  
     c. Create new Metadata object.  
     d. index.push(newMetadata).  
     e. await blobs.setJSON("metadata-index.json", index, { etag }).  
     f. If this fails due to etag mismatch, repeat from step (b).  
  7. Return 201 Created with the new Metadata object.

### **GET /api/images**

* **Purpose:** Fetches a paginated and filtered list of images.  
* **Query Parameters:**  
  * page: number (e.g., 1) - For pagination.  
  * limit: number (e.g., 20) - Items per page.  
  * rating?: "safe" | "nsfw" - Filter by rating.  
  * characters?: string - Comma-separated list of characters to filter by (e.g., "char1,char2"). Logic should find images that have *at least one* of these characters.  
* **Logic:**  
  1. `const allMetadata = await blobs.getJSON("metadata-index.json")`. Handle empty index.  
  2. **Filter:** Apply rating and characters filters to allMetadata.  
  3. **Sort:** Sort the filtered array (e.g., newest first, by uploadedAt).  
  4. **Paginate:** Use `slice()` with page and limit to get the current page's metadata.  
  5. **Generate Signed URLs:** For each Metadata object in the paginated list, generate a signed URL: `const url = await blobs.getSignedURL(meta.id)`.  
  6. **Return:** Send a JSON response: 
     ``` 
     {  
       "data": [  
         { "id": "...", "rating": "...", "character": [...], "url": "..." },  
         ...  
       ],  
       "pageInfo": {  
         "currentPage": 1,  
         "totalPages": 10,  
         "totalItems": 200  
       }  
     }
     ```

## **5. Frontend React Application (/src)**

### **Key Components**

1. **App.tsx**
   * Sets up TanStack Query QueryClientProvider. (As requested, we will use this to manage server state professionally).
   * Sets up react-router-dom with routes:
     * /: ImageGridPage
     * /upload: UploadPage
     * /extract: ExtractPage (Legacy Feature)

2. **ImageGridPage.tsx**
   * **State:** Manages filter state (rating, characters).
   * **Data Fetching:** Uses useInfiniteQuery from TanStack Query to call /api/images.
     * getNextPageParam: Uses pageInfo.currentPage + 1.
     * The query key should update when filters change to trigger a refetch.
   * **UI:**
     * Renders filter controls (dropdown for rating, text input for characters).
     * Renders a grid of ImageThumbnail components, passing data from the query.
     * Handles loading and error states.
     * Implements "load more" button or infinite scroll (triggering fetchNextPage).
   * **Modal Logic:** Manages state for the selected image (selectedImageId). When set, renders ImageLightbox.

3. **ImageThumbnail.tsx**
   * Receives `{ id, url, rating, ... }` as props.
   * Renders a `<div>` or `<img>` styled as a small square. Uses url for the image source or background image.
   * onClick: Calls a function passed from ImageGridPage to set this image as the selectedImageId.

4. **ImageLightbox.tsx**
   * **Props:** `{ image: { url, id, ... }, onClose: () => void }`.
   * **UI:**
     * Renders a semi-transparent masked overlay (position: fixed).
     * Renders an `<img>` tag in the center.
     * src is set to image.url.
     * Styled to expand to the full height of the screen (e.g., max-h-screen w-auto or h-screen max-w-auto with object-fit: contain).
     * onClick on the overlay or a close button calls onClose.

5. **UploadPage.tsx**
   * **UI:** Renders a <form> with:
     * `<input type="file" accept="image/*" />`
     * `<select>` for rating ("safe", "nsfw").
     * `<input type="text" />` for character tags (instruct user to use commas).
     * `<input type="password" />` for the secretKey.
   * **State:** Uses useState to manage form inputs.
   * **Data Mutation:** Uses useMutation from TanStack Query to call /api/upload.
   * **Submit Handler:**
     1. Prevents default form submission.
     2. Creates a FormData object.
     3. Appends image (file), rating, character, and secretKey.
     4. Calls mutation.mutate(formData).
     5. On success, navigates back to / or shows a success message.
     6. Handles loading and error states (e.g., showing a "Wrong key" message on a 401 response).

6. **ExtractPage.tsx (Legacy Feature)**
   * **Purpose:** Preserve existing TXT file image extraction functionality for backward compatibility.
   * **UI:**
     * `<input type="file" accept=".txt" multiple />` for selecting TXT files
     * Instructions explaining the TXT file format expectations
   * **Logic:**
     * Uses FileReader to read TXT files as text
     * Converts base64-encoded images to data URLs
     * Displays extracted images in ImageContainer
   * **State:** Manages array of extracted images in client-side state only (no server persistence)

7. **UploadSection.tsx (Legacy Sub-component)**
   * Reusable upload UI component used by ExtractPage
   * Handles file selection and validation

8. **ImageContainer.tsx (Legacy Sub-component)**
   * Displays array of images as a grid
   * Renders img tags with base64 data URLs
   * Shows placeholder when no images are present

## **6. Data Flow Summary**

### **Upload Flow**

1. **User (Browser):** Fills out UploadPage form (including secret key) and submits.  
2. **React:** useMutation creates FormData and POSTs to /api/upload.  
3. Netlify Function (upload): 
   a. Validates secretKey against `process.env.UPLOAD_SECRET_KEY`. (401 if mismatch).  
   b. Receives FormData.  
   c. Saves image file to Netlify Blobs (key: uuid).  
   d. Reads metadata-index.json (with etag).  
   e. Pushes new Metadata (with uuid) to the index array.  
   f. Saves metadata-index.json (with etag).  
   g. Returns 201 success.  
4. **React:** useMutation onSuccess hook invalidates the /api/images query to refresh the grid.

### **Browse/Filter Flow**

1. **User (Browser):** Loads ImageGridPage.
2. **React:** useInfiniteQuery GETs /api/images?page=1&limit=20.
3. Netlify Function (images):
   a. Reads metadata-index.json.
   b. Filters array (no filters on first load).
   c. Sorts by date.
   d. `slice()` to get page 1.
   e. `await Promise.all(...)` to get a getSignedURL for each item.
   f. Returns JSON payload (data + pageInfo).
4. **React:** Renders the grid with the images.
5. **User (Browser):** Clicks ImageThumbnail.
6. **React:** Sets selectedImage state. ImageLightbox component renders using the url from the query data.

### **Legacy TXT Extraction Flow**

1. **User (Browser):** Navigates to /extract tab and selects TXT files.
2. **React (ExtractPage):**
   a. Uses FileReader API to read each TXT file as text.
   b. Extracts base64-encoded image data from file contents.
   c. Converts base64 strings to data URLs.
   d. Stores images in component state (useState).
3. **React:** Renders ImageContainer with the extracted images using data URLs.
4. **User (Browser):** Views extracted images client-side only (no server upload or persistence).