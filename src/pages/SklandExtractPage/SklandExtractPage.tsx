import { useState, type FormEvent } from 'react';

import ImageContainer from '@components/ImageContainer/ImageContainer';
import { parseSklandArticleId, useGetSklandImages } from '@hooks/useGetSklandImages';

import './SklandExtractPage.css';

const SklandExtractPage = () => {
  const [input, setInput] = useState('');
  const [articleId, setArticleId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>();
  const { imageUrls, title, isLoading, errorMessage, refetch } = useGetSklandImages(articleId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedArticleId = parseSklandArticleId(input.trim());

    if (!parsedArticleId) {
      setArticleId(null);
      setValidationError('请输入受支持的森空岛帖子链接');
      return;
    }

    setValidationError(undefined);
    if (parsedArticleId === articleId) {
      void refetch();
      return;
    }
    setArticleId(parsedArticleId);
  };

  const placeholder = articleId ? (
    <div className='placeholder'>
      <p>帖子未包含图片</p>
    </div>
  ) : undefined;

  return (
    <div className='skland card'>
      <form className='skland-form' onSubmit={handleSubmit}>
        <label htmlFor='skland-link'>森空岛帖子链接</label>
        <div className='skland-input-row'>
          <input
            id='skland-link'
            type='text'
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='https://www.skland.com/article?id=...'
            maxLength={2048}
          />
          <button type='submit' disabled={isLoading}>
            {isLoading ? '提取中...' : '提取原图'}
          </button>
        </div>
        {validationError ? <p className='skland-validation-error'>{validationError}</p> : null}
      </form>
      {title ? <p className='skland-title'>{title}</p> : null}
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
