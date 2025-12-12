import React, { useEffect } from 'react';
import { ImageWithUrl } from '@/types';
import './ImageLightbox.css';

interface ImageLightboxProps {
  image: ImageWithUrl;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ image, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className='image-lightbox' onClick={handleOverlayClick}>
      <div className='lightbox-content'>
        <button className='close-button' onClick={onClose} aria-label='Close'>
          ×
        </button>

        <img src={image.url} alt={image.originalFilename} className='lightbox-image' />

        <div className='image-details'>
          <h3>{image.originalFilename}</h3>
          <div className='details-grid'>
            <div className='detail-item'>
              <span className='detail-label'>Rating:</span>
              <span className={`detail-value rating-${image.rating}`}>{image.rating}</span>
            </div>
            <div className='detail-item'>
              <span className='detail-label'>Uploaded:</span>
              <span className='detail-value'>
                {new Date(image.uploadedAt).toLocaleDateString()}
              </span>
            </div>
            {image.character.length > 0 && (
              <div className='detail-item full-width'>
                <span className='detail-label'>Characters:</span>
                <span className='detail-value'>{image.character.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
