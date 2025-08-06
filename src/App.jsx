import React, { useState } from 'react';
import Header from './components/Header';
import MainContent from './components/MainContent';
import UploadSection from './components/UploadSection';
import ImageContainer from './components/ImageContainer';
import './styles/global.css';

const App = () => {
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
    <div className="container">
      <Header />
      <MainContent>
        <UploadSection onFileChange={handleFileChange} />
        <ImageContainer images={images} />
      </MainContent>
    </div>
  );
};

export default App;
