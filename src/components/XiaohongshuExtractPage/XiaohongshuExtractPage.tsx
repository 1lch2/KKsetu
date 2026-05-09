import { useState, useRef, useEffect } from 'react';
import ImageContainer from '../ImageContainer/ImageContainer';
import CookieDialog, { type CookieDialogHandle } from './__internal__/CookieDialog';
import { useGetXhsImages } from '@/hooks/useGetXhsImages';
import './XiaohongshuExtractPage.css';

const COOKIE_KEY = 'xhs_cookie';

const XiaohongshuExtractPage = () => {
  const [shareContent, setShareContent] = useState('');
  const [cookieValue, setCookieValue] = useState('');
  const dialogRef = useRef<CookieDialogHandle>(null);
  const { imageUrls = [], isLoading, error } = useGetXhsImages(shareContent);

  useEffect(() => {
    setCookieValue(localStorage.getItem(COOKIE_KEY) || '');
  }, []);

  const handleSaveCookie = () => {
    localStorage.setItem(COOKIE_KEY, cookieValue);
    dialogRef.current?.close();
  };

  if (error) {
    console.log('Load image error:', error);
  }
  return (
    <div className='xiaohongshu card'>
      <div className='xiaohongshu-input-wrapper'>
        <label htmlFor='xiaohongshu-link'>小红书分享链接</label>
        <input
          id='xiaohongshu-link'
          type='text'
          value={shareContent}
          onChange={(e) => setShareContent(e.target.value)}
          placeholder='粘贴小红书分享内容或链接...'
        />
      </div>
      <ImageContainer images={imageUrls} isLoading={isLoading} isError={!!error} />
      <button className='xhs-cookie-btn' onClick={() => dialogRef.current?.show()}>
        设置 Cookie
      </button>
      <CookieDialog
        ref={dialogRef}
        cookieValue={cookieValue}
        onCookieChange={setCookieValue}
        onSave={handleSaveCookie}
      />
    </div>
  );
};

export default XiaohongshuExtractPage;
