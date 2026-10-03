import { useState, useEffect } from 'react';
import ImageContainer from '@components/ImageContainer/ImageContainer';
import CookieDialog from './__internal__/CookieDialog/CookieDialog';
import CookieTips from './__internal__/CookieTips/CookieTips';
import { useGetXhsImages } from '@/hooks/useGetXhsImages';
import './XiaohongshuExtractPage.css';

const COOKIE_KEY = 'xhs_cookie';

const XiaohongshuExtractPage = () => {
  const [shareContent, setShareContent] = useState('');
  const [cookieValue, setCookieValue] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cookieRevision, setCookieRevision] = useState(0);
  const { imageUrls, isLoading, error, failedCount, retry } = useGetXhsImages(
    shareContent,
    cookieRevision
  );

  useEffect(() => {
    setCookieValue(localStorage.getItem(COOKIE_KEY) || '');
  }, []);

  const handleSaveCookie = () => {
    localStorage.setItem(COOKIE_KEY, cookieValue);
    setIsDialogOpen(false);
    setCookieRevision((revision) => revision + 1);
  };

  return (
    <div className='xiaohongshu card'>
      <div className='xiaohongshu-input-wrapper'>
        <div className='xiaohongshu-input-label'>
          <label htmlFor='xiaohongshu-link'>小红书分享链接</label>
          <button className='xhs-cookie-btn' onClick={() => setIsDialogOpen(true)}>
            设置 Cookie
          </button>
        </div>
        <input
          id='xiaohongshu-link'
          type='text'
          value={shareContent}
          onChange={(e) => setShareContent(e.target.value)}
          placeholder='粘贴小红书分享内容或链接...'
        />
      </div>
      <ImageContainer
        images={imageUrls}
        isLoading={isLoading}
        errorMessage={error?.message}
        imageActionProxyEndpoint='/api/getXhsSourceImage'
      />
      {!isLoading && (error || failedCount > 0) && (
        <div className='xhs-retry' role='status'>
          {failedCount > 0 && !error && <span>部分图片加载失败，已显示成功加载的图片。</span>}
          <button type='button' className='xhs-cookie-btn' onClick={() => void retry()}>
            重新尝试
          </button>
        </div>
      )}
      <CookieTips />
      <CookieDialog
        isOpen={isDialogOpen}
        cookieValue={cookieValue}
        onCookieChange={setCookieValue}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveCookie}
      />
    </div>
  );
};

export default XiaohongshuExtractPage;
