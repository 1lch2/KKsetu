import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BASE_URL } from '@utils/constants';

type ImageAction = 'copy' | 'download';

interface ContextMenuPosition {
  x: number;
  y: number;
}

const MENU_MARGIN = 8;
const MENU_WIDTH = 180;
const MENU_HEIGHT = 120;

// CDN response headers and URL extensions are not reliable enough to distinguish
// JPEG/JFIF, so inspect the shared JPEG start-of-image signature instead.
const isJpeg = async (blob: Blob): Promise<boolean> => {
  const bytes = new Uint8Array(await blob.slice(0, 3).arrayBuffer());

  return (
    bytes.length === 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  );
};

const getFilenameFromUrl = (imageSrc: string): string => {
  try {
    const url = new URL(imageSrc, window.location.href);
    // Data URLs have no path segment that can serve as a filename. Blob URLs do,
    // so keep their final path segment just like regular remote URLs.
    if (url.protocol === 'data:') {
      return 'image';
    }

    const encodedFilename = url.pathname.split('/').filter(Boolean).at(-1);
    if (!encodedFilename) {
      return 'image';
    }

    try {
      return decodeURIComponent(encodedFilename);
    } catch {
      return encodedFilename;
    }
  } catch (error) {
    console.error('Failed to parse image URL', error);
    return 'image';
  }
};

const getDownloadFilename = (imageSrc: string, jpeg: boolean): string => {
  const originalFilename = getFilenameFromUrl(imageSrc);
  if (!jpeg) {
    return originalFilename;
  }

  const extensionIndex = originalFilename.lastIndexOf('.');
  // Preserve the URL-provided basename and normalize only its final extension.
  const basename = extensionIndex > 0 ? originalFilename.slice(0, extensionIndex) : originalFilename;
  return `${basename}.jpg`;
};

const isRemoteUrl = (imageSrc: string): boolean => {
  try {
    const protocol = new URL(imageSrc, window.location.href).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch (error) {
    console.error('Failed to parse image URL', error);
    return false;
  }
};

const isSklandImageUrl = (imageSrc: string): boolean => {
  try {
    return new URL(imageSrc).hostname.toLowerCase() === 'bbs.hycdn.cn';
  } catch {
    return false;
  }
};

const fetchProxiedImage = async (imageSrc: string): Promise<Blob> => {
  const proxyUrl = `${BASE_URL}/api/getXhsSourceImage?url=${encodeURIComponent(imageSrc)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Image proxy request failed: ${response.status}`);
  }
  return await response.blob();
};

const fetchImageBlob = async (imageSrc: string): Promise<Blob> => {
  // 森空岛 CDN 不返回 Access-Control-Allow-Origin。图片标签可以显示，
  // 但浏览器 fetch 无法读取响应，所以下载时直接交给同源服务端代理。
  if (isSklandImageUrl(imageSrc)) {
    return await fetchProxiedImage(imageSrc);
  }

  try {
    const response = await fetch(imageSrc, { referrerPolicy: 'no-referrer' });
    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    if (!isRemoteUrl(imageSrc)) {
      throw error;
    }

    // 其他受支持的远程图片仍优先直连；仅在 CORS 等浏览器限制出现时回退代理。
    return await fetchProxiedImage(imageSrc);
  }
};

const downloadImage = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const convertImageToPng = async (blob: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(blob);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create image canvas');
    }

    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error('Failed to encode clipboard image'));
        }
      }, 'image/png');
    });
  } finally {
    bitmap.close();
  }
};

interface FullscreenOverlayProps {
  imageSrc: string;
  currentIndex: number;
  totalImages: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

const FullscreenOverlay: React.FC<FullscreenOverlayProps> = ({
  imageSrc,
  currentIndex,
  totalImages,
  onPrevious,
  onNext,
  onClose,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(
    null
  );
  const [activeAction, setActiveAction] = useState<ImageAction | null>(null);
  const [actionError, setActionError] = useState('');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        onPrevious();
      } else if (event.key === 'ArrowRight' && currentIndex < totalImages - 1) {
        onNext();
      }
    },
    [currentIndex, onClose, onNext, onPrevious, totalImages]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setContextMenuPosition(null);
      onClose();
    }
  };

  // The iframe is a separate document, so pointer events inside it never bubble
  // to React. Attach backdrop and context-menu handlers directly once loaded.
  const handleIframeLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const image = doc?.querySelector('img');
    if (!doc || !image) {
      return;
    }

    doc.body.onclick = (event) => {
      setContextMenuPosition(null);
      if (event.target === event.currentTarget) {
        onClose();
      }
    };

    doc.body.oncontextmenu = (event) => {
      event.preventDefault();
      if (event.target !== image) {
        setContextMenuPosition(null);
        return;
      }

      const iframeBounds = iframeRef.current?.getBoundingClientRect();
      if (!iframeBounds) {
        return;
      }

      setActionError('');
      // contextmenu coordinates belong to the iframe viewport; translate them
      // into the parent viewport and keep the custom menu within the screen.
      setContextMenuPosition({
        x: Math.min(
          Math.max(MENU_MARGIN, iframeBounds.left + event.clientX),
          window.innerWidth - MENU_WIDTH - MENU_MARGIN
        ),
        y: Math.min(
          Math.max(MENU_MARGIN, iframeBounds.top + event.clientY),
          window.innerHeight - MENU_HEIGHT - MENU_MARGIN
        ),
      });
    };
  }, [onClose]);

  const handleImageAction = async (action: ImageAction) => {
    if (activeAction) {
      return;
    }

    setActiveAction(action);
    setActionError('');

    try {
      const sourceBlob = await fetchImageBlob(imageSrc);
      const jpeg = await isJpeg(sourceBlob);
      const filename = getDownloadFilename(imageSrc, jpeg);
      // Downloads keep JPEG bytes and expose them consistently as image/jpeg.
      const imageBlob = jpeg ? sourceBlob.slice(0, sourceBlob.size, 'image/jpeg') : sourceBlob;

      if (action === 'download') {
        downloadImage(imageBlob, filename);
      } else {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
          throw new Error('当前浏览器不支持复制图片');
        }

        // Chromium rejects image/jpeg in ClipboardItem. PNG is the interoperable
        // clipboard image format, so convert only for clipboard output.
        const clipboardBlob =
          imageBlob.type === 'image/png' ? imageBlob : await convertImageToPng(imageBlob);
        await navigator.clipboard.write([
          new ClipboardItem({ [clipboardBlob.type]: clipboardBlob }),
        ]);
      }

      setContextMenuPosition(null);
    } catch (error) {
      console.error(`Failed to ${action} image`, error);
      setActionError(action === 'copy' ? '复制图片失败，请检查浏览器权限' : '保存图片失败');
    } finally {
      setActiveAction(null);
    }
  };

  // Keep the image in an about:blank srcdoc so its request does not carry the
  // current page as Referer, avoiding 403 responses from some image servers.
  const iframeSrcDoc = useMemo(
    () =>
      `<!DOCTYPE html>
<html><head><style>
  body { margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; }
  img { max-width:100%; max-height:100vh; object-fit:contain; }
</style></head><body>
  <img src="${imageSrc}" referrerpolicy="no-referrer" alt="Full size image" />
</body></html>`,
    [imageSrc]
  );

  return (
    <div className='fullscreen-overlay' onClick={handleBackdropClick}>
      <button className='fullscreen-overlay__close' onClick={onClose} aria-label='关闭'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth='2'
          stroke='currentColor'
        >
          <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
        </svg>
      </button>
      {currentIndex > 0 && (
        <button
          className='fullscreen-overlay__nav fullscreen-overlay__nav--previous'
          onClick={onPrevious}
          aria-label='上一张'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='2'
            stroke='currentColor'
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 19.5L8.25 12l7.5-7.5' />
          </svg>
        </button>
      )}
      {currentIndex < totalImages - 1 && (
        <button
          className='fullscreen-overlay__nav fullscreen-overlay__nav--next'
          onClick={onNext}
          aria-label='下一张'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='2'
            stroke='currentColor'
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 4.5l7.5 7.5-7.5 7.5' />
          </svg>
        </button>
      )}
      <iframe
        ref={iframeRef}
        className='fullscreen-overlay__iframe'
        srcDoc={iframeSrcDoc}
        onLoad={handleIframeLoad}
        title='Image viewer'
      />
      {contextMenuPosition && (
        <div
          className='fullscreen-overlay__context-menu'
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          role='menu'
          aria-label='图片操作'
        >
          <button
            type='button'
            role='menuitem'
            disabled={activeAction !== null}
            onClick={() => void handleImageAction('copy')}
          >
            {activeAction === 'copy' ? '正在复制…' : '复制图片'}
          </button>
          <button
            type='button'
            role='menuitem'
            disabled={activeAction !== null}
            onClick={() => void handleImageAction('download')}
          >
            {activeAction === 'download' ? '正在保存…' : '保存图片'}
          </button>
          {actionError && (
            <p className='fullscreen-overlay__context-menu-error' role='alert'>
              {actionError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FullscreenOverlay;
