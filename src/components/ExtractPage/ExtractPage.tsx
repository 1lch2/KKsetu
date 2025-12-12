import React, { useState } from 'react';
import UploadSection from './__internal__/UploadSection/UploadSection';
import ImageContainer from './__internal__/ImageContainer/ImageContainer';

const ExtractPage = () => {
  const [images, setImages] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setImages([]); // Clear previous images

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const imageSrc = `data:image/png;base64,${result}`;
          setImages((prevImages) => [...prevImages, imageSrc]);
        }
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className='main-content-with-tabs'>
      <UploadSection onFileChange={handleFileChange} />
      <ImageContainer images={images} />
    </div>
  );
};

export default ExtractPage;
