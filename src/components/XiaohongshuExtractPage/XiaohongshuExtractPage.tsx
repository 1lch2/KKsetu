import React, { useState } from 'react';
import ImageContainer from '../ImageContainer/ImageContainer';
import { getImageUrls } from '@/utils/xiaohongshuExtract';
import './XiaohongshuExtractPage.css';

const XiaohongshuExtractPage = () => {
  const [shareContent, setShareContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const handleLinkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawShareContent = e.target.value;
    setShareContent(rawShareContent);

    const images = await getImageUrls(rawShareContent);
    if (images && images.length !== 0) {
      setImageUrls(images);
    }
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
      </div>
      <ImageContainer images={imageUrls} />
    </div>
  );
};

export default XiaohongshuExtractPage;
