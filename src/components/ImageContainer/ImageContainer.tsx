import React, { useState, useCallback } from 'react';
import FullscreenOverlay from './__internal__/FullscreenOverlay';
import './ImageContainer.css';

interface ImageContainerProps {
  images: string[];
  isLoading?: boolean;
  isError?: boolean;
}

const ImageContainer = (props: ImageContainerProps) => {
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);

  const handleImageClick = useCallback((index: number) => {
    setOverlayIndex(index);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setOverlayIndex(null);
  }, []);

  const handlePreviousImage = useCallback(() => {
    setOverlayIndex((currentIndex) =>
      currentIndex === null ? null : Math.max(0, currentIndex - 1)
    );
  }, []);

  const handleNextImage = useCallback(() => {
    setOverlayIndex((currentIndex) =>
      currentIndex === null ? null : Math.min(props.images.length - 1, currentIndex + 1)
    );
  }, [props.images.length]);

  const renderPlaceholder = () => (
    <div className='placeholder'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth='1.5'
        stroke='currentColor'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z'
        />
      </svg>
      <p>图片会显示在这里</p>
    </div>
  );

  return (
    <div className='card'>
      <div className='img-container'>
        {props.isLoading ? (
          <div className='loading-state'>加载中...</div>
        ) : props.isError ? (
          <div className='loading-state'>加载失败，请设置小红书cookie后再次尝试</div>
        ) : props.images.length === 0 ? (
          renderPlaceholder()
        ) : (
          props.images.map((imageSrc, index) => (
            <img
              key={index}
              src={imageSrc}
              alt={`Image ${index + 1}`}
              id={`img-display-${index}`}
              referrerPolicy='no-referrer'
              onClick={() => handleImageClick(index)}
            />
          ))
        )}
      </div>
      {overlayIndex !== null && props.images[overlayIndex] && (
        <FullscreenOverlay
          imageSrc={props.images[overlayIndex]}
          currentIndex={overlayIndex}
          totalImages={props.images.length}
          onPrevious={handlePreviousImage}
          onNext={handleNextImage}
          onClose={handleCloseOverlay}
        />
      )}
    </div>
  );
};

export default ImageContainer;
