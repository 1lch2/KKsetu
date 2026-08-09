import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ImageContainer from '@components/ImageContainer/ImageContainer';
import { transformImage, type TransformDirection } from '@utils/imageObfuscation';

import './ImageObfuscationPage.css';

interface ObfuscationImage {
  name: string;
  originalUrl: string;
  displayedUrl: string;
  mimeType: string;
}

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const getFileMimeType = (file: File) => {
  const fileMimeType = file.type.toLowerCase();
  const normalizedMimeType = fileMimeType === 'image/jpg' ? 'image/jpeg' : fileMimeType;
  if (SUPPORTED_MIME_TYPES.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPE_BY_EXTENSION[extension] || '';
};

const waitForPaint = () => {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
};

const ImageObfuscationPage = () => {
  const location = useLocation();
  const [images, setImages] = useState<ObfuscationImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const ownedUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = ownedUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const replaceImages = useCallback((files: File[]) => {
    const filesWithMimeType = files.map((file) => ({ file, mimeType: getFileMimeType(file) }));
    const supportedFiles = filesWithMimeType.filter((item) => item.mimeType);
    const unsupportedNames = filesWithMimeType
      .filter((item) => !item.mimeType)
      .map(({ file }) => file.name);

    if (supportedFiles.length === 0) {
      setErrorMessage('请选择 PNG、JPG/JPEG 或 WebP 格式的图片');
      return;
    }

    ownedUrls.current.forEach((url) => URL.revokeObjectURL(url));
    ownedUrls.current.clear();

    const nextImages = supportedFiles.map(({ file, mimeType }) => {
      const imageUrl = URL.createObjectURL(file);
      ownedUrls.current.add(imageUrl);
      return {
        name: file.name,
        originalUrl: imageUrl,
        displayedUrl: imageUrl,
        mimeType,
      };
    });

    setImages(nextImages);
    setErrorMessage(
      unsupportedNames.length > 0
        ? `已忽略无法保持原格式处理的文件：${unsupportedNames.join('、')}`
        : ''
    );
  }, []);

  const isActive = location.pathname === '/obfuscate';

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      if (isProcessing || !event.clipboardData) {
        return;
      }

      const itemFiles = Array.from(event.clipboardData.items)
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      const clipboardFiles =
        itemFiles.length > 0 ? itemFiles : Array.from(event.clipboardData.files);
      const imageFiles = clipboardFiles.filter(
        (file) => file.type.startsWith('image/') || Boolean(getFileMimeType(file))
      );

      if (imageFiles.length === 0) {
        return;
      }

      event.preventDefault();
      replaceImages(imageFiles);
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isActive, isProcessing, replaceImages]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    replaceImages(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isProcessing) {
      replaceImages(Array.from(event.dataTransfer.files));
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleUploadKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isProcessing && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  const handleUploadAreaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      isProcessing ||
      !(target instanceof Element) ||
      target.closest('.img-container img, .fullscreen-overlay')
    ) {
      return;
    }

    inputRef.current?.click();
  };

  const revokeProcessedUrls = (currentImages: ObfuscationImage[]) => {
    currentImages.forEach((image) => {
      if (image.displayedUrl !== image.originalUrl) {
        URL.revokeObjectURL(image.displayedUrl);
        ownedUrls.current.delete(image.displayedUrl);
      }
    });
  };

  const handleTransform = async (direction: TransformDirection) => {
    if (images.length === 0 || isProcessing) {
      return;
    }

    const currentImages = images;
    const nextImages: ObfuscationImage[] = [];
    const generatedUrls: string[] = [];
    const operationName = direction === 'encrypt' ? '混淆' : '解混淆';
    setIsProcessing(true);
    setErrorMessage('');

    try {
      for (let index = 0; index < currentImages.length; index += 1) {
        const image = currentImages[index];
        setProcessingMessage(`正在${operationName}第 ${index + 1}/${currentImages.length} 张图片…`);
        await waitForPaint();

        try {
          const result = await transformImage(image.displayedUrl, direction, image.mimeType);
          const resultUrl = URL.createObjectURL(result);
          generatedUrls.push(resultUrl);
          nextImages.push({ ...image, displayedUrl: resultUrl });
        } catch (error) {
          const message = error instanceof Error ? error.message : '图片处理失败';
          throw new Error(`${image.name}：${message}`);
        }
      }

      revokeProcessedUrls(currentImages);
      generatedUrls.forEach((url) => ownedUrls.current.add(url));
      setImages(nextImages);
    } catch (error) {
      generatedUrls.forEach((url) => URL.revokeObjectURL(url));
      console.error('Image obfuscation failed:', error);
      setErrorMessage(error instanceof Error ? error.message : '图片处理失败，请重试');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleClear = () => {
    ownedUrls.current.forEach((url) => URL.revokeObjectURL(url));
    ownedUrls.current.clear();
    setImages([]);
    setErrorMessage('');
  };

  return (
    <div className='image-obfuscation card'>
      <div className='image-obfuscation-intro'>
        <h2>空间填充曲线图片混淆</h2>
        <p>
          基于 Gilbert 空间填充曲线重新排列像素，在浏览器本地批量处理，并保持图片原始尺寸和格式。
        </p>
      </div>

      <div className='image-obfuscation-actions'>
        <button
          className='obfuscation-button obfuscation-button--primary'
          type='button'
          disabled={images.length === 0 || isProcessing}
          onClick={() => void handleTransform('encrypt')}
        >
          混淆
        </button>
        <button
          className='obfuscation-button obfuscation-button--primary'
          type='button'
          disabled={images.length === 0 || isProcessing}
          onClick={() => void handleTransform('decrypt')}
        >
          解混淆
        </button>
        <button
          className='obfuscation-button'
          type='button'
          disabled={images.length === 0 || isProcessing}
          onClick={handleClear}
        >
          清空容器
        </button>
      </div>

      {processingMessage && (
        <p className='image-obfuscation-status' role='status'>
          {processingMessage}
        </p>
      )}
      {errorMessage && (
        <p className='image-obfuscation-error' role='alert'>
          {errorMessage}
        </p>
      )}

      <div
        className={`image-obfuscation-upload ${isDragging ? 'is-dragging' : ''} ${
          isProcessing ? 'is-disabled' : ''
        }`}
        role='button'
        tabIndex={isProcessing ? -1 : 0}
        aria-label='点击、拖拽或粘贴上传多张图片'
        aria-disabled={isProcessing}
        onClick={handleUploadAreaClick}
        onKeyDown={handleUploadKeyDown}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isProcessing) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {images.length > 0 && (
          <p className='image-obfuscation-upload-hint'>
            当前共 {images.length} 张图片，点击空白处、拖入图片或按 Ctrl+V 可替换当前批次
          </p>
        )}
        <ImageContainer
          images={images.map((image) => image.displayedUrl)}
          placeholder={
            <div className='image-obfuscation-placeholder'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth='1.5'
                stroke='currentColor'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z'
                />
              </svg>
              <strong>点击、拖拽或按 Ctrl+V 粘贴图片</strong>
              <span>支持同时上传多张 PNG、JPG/JPEG 或 WebP 图片</span>
            </div>
          }
        />
      </div>
      <input
        ref={inputRef}
        className='image-obfuscation-file-input'
        type='file'
        accept='.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
        multiple
        disabled={isProcessing}
        onChange={handleFileChange}
      />

      <p className='image-obfuscation-source'>
        空间填充曲线混淆代码移植自{' '}
        <a href='https://xfqtphx.netlify.app/' target='_blank' rel='noreferrer'>
          https://xfqtphx.netlify.app/
        </a>
      </p>
    </div>
  );
};

export default ImageObfuscationPage;
