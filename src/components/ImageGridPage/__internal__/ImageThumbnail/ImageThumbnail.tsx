import React from 'react';
import { ImageWithUrl } from '../../../../types';
import '../styles/ImageThumbnail.css';

interface ImageThumbnailProps {
  image: ImageWithUrl;
  onClick: (image: ImageWithUrl) => void;
}

const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ image, onClick }) => {
  return (
    <div className='image-thumbnail' onClick={() => onClick(image)}>
      <img src={image.url} alt={image.originalFilename} loading='lazy' />
      <div className='image-info'>
        <div className='image-rating'>{image.rating}</div>
        {image.character.length > 0 && (
          <div className='image-characters'>
            {image.character.slice(0, 2).join(', ')}
            {image.character.length > 2 && '...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageThumbnail;
