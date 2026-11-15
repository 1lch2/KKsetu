import { useState, type ChangeEvent } from 'react';
import { useLocation } from 'react-router-dom';

import ImageContainer from '@components/ImageContainer/ImageContainer';
import { parseSklandArticleId, useGetSklandImages } from '@hooks/useGetSklandImages';

import './SklandExtractPage.css';

const SklandExtractPage = () => {
  const { pathname } = useLocation();
  const [input, setInput] = useState('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>();
  const { imageUrls, isLoading, errorMessage } = useGetSklandImages(articleId);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const parsedArticleId = parseSklandArticleId(value.trim());

    setInput(value);
    setArticleId(parsedArticleId);

    setValidationError(undefined);
  };

  const placeholder = articleId ? (
    <div className='placeholder'>
      <p>帖子未包含图片</p>
    </div>
  ) : undefined;

  return (
    <div className='skland card'>
      <div className='skland-input-wrapper'>
        <label htmlFor='skland-link'>森空岛帖子链接</label>
        <input
          id='skland-link'
          type='text'
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
          value={input}
          onChange={handleInputChange}
          onBlur={() => {
            setValidationError(
              input.trim() && !parseSklandArticleId(input.trim())
                ? '请输入受支持的森空岛帖子链接'
                : undefined
            );
          }}
          aria-invalid={Boolean(validationError) || undefined}
          aria-describedby={validationError ? 'skland-link-error' : undefined}
          placeholder='https://www.skland.com/article?id=...'
          maxLength={2048}
        />
        <p id='skland-link-error' className='skland-validation-error' aria-live='polite'>
          {validationError}
        </p>
      </div>
      <ImageContainer
        isActive={pathname === '/skland'}
        images={imageUrls}
        isLoading={isLoading}
        errorMessage={errorMessage}
        placeholder={placeholder}
        imageActionProxyEndpoint='/api/getSklandSourceImage'
        preferImageActionProxy
      />
    </div>
  );
};

export default SklandExtractPage;
