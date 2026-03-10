import React from 'react';
import './ImageContainer.css';

interface ImageContainerProps {
  images: string[];
}

const ImageContainer: React.FC<ImageContainerProps> = ({ images }) => {
  const isDesktop = () => {
    // Check if the screen width is greater than typical mobile screen sizes
    // or if the user agent indicates a desktop browser
    const width = window.innerWidth;
    const userAgent = navigator.userAgent;

    // Consider devices with width > 768px as desktop
    // Also check user agent to be more precise
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );

    return width > 768 && !isMobileDevice;
  };

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    // Only proceed if on desktop environment
    if (!isDesktop()) {
      return;
    }

    // Get the image source from the clicked image
    const imgSrc = (event.target as HTMLImageElement).src;

    // Create a new window and write the image data to it
    // This handles both base64 data URLs and regular image URLs
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>

        <head>
          <title>Image Viewer</title>
          <style>
            body {
              margin: 0;
              background: #000;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <img src="${imgSrc}" referrerPolicy="no-referrer" alt="Full size image" />
        </body>

      `);
      newWindow.document.close();
    }
  };

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
        {images.length === 0
          ? renderPlaceholder()
          : images.map((imageSrc, index) => (
              <img
                key={index}
                src={imageSrc}
                alt={`Image ${index + 1}`}
                id={`img-display-${index}`}
                referrerPolicy='no-referrer'
                onClick={handleImageClick}
              />
            ))}
      </div>
    </div>
  );
};

export default ImageContainer;
