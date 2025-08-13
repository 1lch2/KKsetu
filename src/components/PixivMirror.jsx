import React, { useState } from 'react';
import '../styles/PixivMirror.css';

const PixivMirror = () => {
  const [inputValue, setInputValue] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleFetchImage = async () => {
    // Placeholder for fetching image from netlify functions
    // In a real implementation, this would call the netlify function
    if (inputValue.trim()) {
      // Simulate fetching an image
      const res = await fetch(`https://kksetu.netlify.app/pid/${inputValue}`, {
        method: 'GET',
      });

      if (res.ok) {
        const result = await res.json();
        console.log(result);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleFetchImage();
    }
  };

  return (
    <div className='main-content-with-tabs'>
      <div className='card'>
        <h3>Pixiv 镜像浏览</h3>
        <div className='pixiv-input-container'>
          <input
            type='text'
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder='开发中功能，暂不可用'
            className='pixiv-input'
          />
          <button onClick={handleFetchImage} className='fetch-button'>
            获取图片
          </button>
        </div>
        <div className='pixiv-image-container'>
          {imageUrl ? (
            <img src={imageUrl} alt='Pixiv artwork' className='pixiv-image' />
          ) : (
            <div className='image-placeholder'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth='1.5'
                stroke='currentColor'
                className='placeholder-icon'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z'
                />
              </svg>
              <p>开发中，暂不可用</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PixivMirror;
