import React, { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import ImageThumbnail from './__internal__/ImageThumbnail/ImageThumbnail';
import ImageLightbox from './__internal__/ImageLightbox/ImageLightbox';
import { ImageWithUrl } from '../../types';
import '../styles/ImageGridPage.css';

const ImageGridPage: React.FC = () => {
  const [ratingFilter, setRatingFilter] = useState<'' | 'safe' | 'nsfw'>('');
  const [characterFilter, setCharacterFilter] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<ImageWithUrl | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['images', ratingFilter, characterFilter],
      queryFn: async ({ pageParam = 1 }) => {
        const params = new URLSearchParams({
          page: pageParam.toString(),
          limit: '20',
        });

        if (ratingFilter) {
          params.append('rating', ratingFilter);
        }

        if (characterFilter) {
          params.append('characters', characterFilter);
        }

        const response = await fetch(`/.netlify/functions/images?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }

        return response.json();
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.pageInfo.currentPage < lastPage.pageInfo.totalPages) {
          return lastPage.pageInfo.currentPage + 1;
        }
        return undefined;
      },
      initialPageParam: 1,
    });

  useEffect(() => {
    // Close lightbox when navigating back
    const handlePopState = () => {
      setSelectedImage(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleImageClick = (image: ImageWithUrl) => {
    setSelectedImage(image);
  };

  const handleCloseLightbox = () => {
    setSelectedImage(null);
  };

  const images: ImageWithUrl[] = data?.pages.flatMap((page) => page.data) || [];

  if (isLoading) {
    return <div className='loading'>Loading images...</div>;
  }

  if (error) {
    return <div className='error'>Error loading images: {error.message}</div>;
  }

  return (
    <div className='image-grid-page'>
      <div className='filters'>
        <div className='filter-group'>
          <label htmlFor='rating'>Rating:</label>
          <select
            id='rating'
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as '' | 'safe' | 'nsfw')}
          >
            <option value=''>All</option>
            <option value='safe'>Safe</option>
            <option value='nsfw'>NSFW</option>
          </select>
        </div>

        <div className='filter-group'>
          <label htmlFor='characters'>Characters:</label>
          <input
            type='text'
            id='characters'
            placeholder='Filter by characters (comma-separated)'
            value={characterFilter}
            onChange={(e) => setCharacterFilter(e.target.value)}
          />
        </div>
      </div>

      <div className='image-grid'>
        {images.length === 0 ? (
          <div className='no-images'>No images found</div>
        ) : (
          images.map((image) => (
            <ImageThumbnail key={image.id} image={image} onClick={() => handleImageClick(image)} />
          ))
        )}
      </div>

      <div className='load-more-container'>
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className='load-more-button'
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load More'}
          </button>
        )}
      </div>

      {selectedImage && <ImageLightbox image={selectedImage} onClose={handleCloseLightbox} />}
    </div>
  );
};

export default ImageGridPage;
