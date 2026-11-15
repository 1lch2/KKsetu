import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ImageContainer from '@components/ImageContainer/ImageContainer';
import { parseImageText } from './__internal__/parseImageText';
import UploadSection from './__internal__/UploadSection/UploadSection';

const ExtractPage = () => {
  const [images, setImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const { pathname } = useLocation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setImages([]); // Clear previous images
    setErrorMessage('');

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        const imageSrc = typeof result === 'string' ? parseImageText(result) : null;
        if (!imageSrc) {
          setErrorMessage('部分 TXT 文件不是有效的 Base64 图片数据，已跳过');
          return;
        }
        setImages((prevImages) => [...prevImages, imageSrc]);
      };
      reader.onerror = () => setErrorMessage('部分 TXT 文件读取失败，请重新选择');
      reader.readAsText(file);
    });
  };

  return (
    <div className='main-content-with-tabs'>
      <UploadSection onFileChange={handleFileChange} />
      <p role='status'>{errorMessage}</p>
      <ImageContainer images={images} isActive={pathname === '/extract'} />
    </div>
  );
};

export default ExtractPage;
