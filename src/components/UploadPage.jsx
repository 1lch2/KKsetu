import React, { useState } from 'react';
import UploadSection from './UploadSection';
import ImageContainer from './ImageContainer';

const UploadPage = () => {
  const [images, setImages] = useState([]);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length === 0) {
      return;
    }

    setImages([]); // Clear previous images

    Array.from(files).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = `data:image/png;base64,${e.target.result}`;
        setImages(prevImages => [...prevImages, imageSrc]);
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className="main-content-with-tabs">
      <UploadSection onFileChange={handleFileChange} />
      <ImageContainer images={images} />
    </div>
  );
};

export default UploadPage;
