import React, { useState } from 'react';
import ImageContainer from '../ImageContainer/ImageContainer';
import { useGetXhsImages } from '@/hooks/useGetXhsImages';
import './XiaohongshuExtractPage.css';

const XiaohongshuExtractPage = () => {
  const [shareContent, setShareContent] = useState('');
  const { imageUrls = [], isLoading, error } = useGetXhsImages(shareContent);

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShareContent(e.target.value);
  };

  return (
    <div className='xiaohongshu card'>
      <div className='xiaohongshu-input-wrapper'>
        <label htmlFor='xiaohongshu-link'>小红书分享链接</label>
        <input
          id='xiaohongshu-link'
          type='text'
          value={shareContent}
          onChange={handleLinkChange}
          placeholder='粘贴小红书分享内容或链接...'
        />
        {isLoading && <span className='loading'>加载中...</span>}
        {error && <span className='error'>加载失败</span>}
      </div>
      <ImageContainer images={imageUrls} />
    </div>
  );
};

export default XiaohongshuExtractPage;
