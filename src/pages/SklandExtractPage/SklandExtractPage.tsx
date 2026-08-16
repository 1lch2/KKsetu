import { useState, type ChangeEvent } from 'react';

import ImageContainer from '@components/ImageContainer/ImageContainer';
import { parseSklandArticleId, useGetSklandImages } from '@hooks/useGetSklandImages';

import './SklandExtractPage.css';

const SklandExtractPage = () => {
  const [input, setInput] = useState('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>();
  const { imageUrls, isLoading, errorMessage } = useGetSklandImages(articleId);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const parsedArticleId = parseSklandArticleId(value.trim());

    setInput(value);
    setArticleId(parsedArticleId);

    if (!parsedArticleId) {
      setValidationError(value.trim() ? '请输入受支持的森空岛帖子链接' : undefined);
      return;
    }

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
          value={input}
          onChange={handleInputChange}
          placeholder='https://www.skland.com/article?id=...'
          maxLength={2048}
        />
        {validationError ? <p className='skland-validation-error'>{validationError}</p> : null}
      </div>
      <ImageContainer
        images={imageUrls}
        isLoading={isLoading}
        errorMessage={errorMessage}
        placeholder={placeholder}
      />
    </div>
  );
};

export default SklandExtractPage;
