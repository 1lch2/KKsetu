import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import ModalDialog from '@components/ModalDialog/ModalDialog';
import { BASE_URL } from '@utils/constants';

type ImageAction = 'copy' | 'download';

interface ContextMenuPosition {
  x: number;
  y: number;
}

const MENU_MARGIN = 8;
const MENU_WIDTH = 180;
const MENU_HEIGHT = 120;

// This template contains no image URL or other untrusted HTML. Keep the blank
// document for no-Referer loading; assign the image through its DOM property.
const IFRAME_SRC_DOC = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>图片预览</title><style>
  body { margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; }
  img { max-width:100%; max-height:100vh; object-fit:contain; }
</style></head><body>
  <img referrerpolicy="no-referrer" alt="预览图片" tabindex="0" />
</body></html>`;

// CDN response headers and URL extensions are not reliable enough to distinguish
// JPEG/JFIF, so inspect the shared JPEG start-of-image signature instead.
const isJpeg = async (blob: Blob): Promise<boolean> => {
  const bytes = new Uint8Array(await blob.slice(0, 3).arrayBuffer());

  return bytes.length === 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
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
  const basename =
    extensionIndex > 0 ? originalFilename.slice(0, extensionIndex) : originalFilename;
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

const fetchProxiedImage = async (
  imageSrc: string,
  imageActionProxyEndpoint: string
): Promise<Blob> => {
  const proxyUrl = `${BASE_URL}${imageActionProxyEndpoint}?url=${encodeURIComponent(imageSrc)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Image proxy request failed: ${response.status}`);
  }
  return await response.blob();
};

const fetchImageBlob = async (
  imageSrc: string,
  imageActionProxyEndpoint?: string,
  preferImageActionProxy?: boolean
): Promise<Blob> => {
  if (imageActionProxyEndpoint && preferImageActionProxy) {
    return await fetchProxiedImage(imageSrc, imageActionProxyEndpoint);
  }

  try {
    const response = await fetch(imageSrc, { referrerPolicy: 'no-referrer' });
    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    if (!isRemoteUrl(imageSrc) || !imageActionProxyEndpoint) {
      throw error;
    }

    return await fetchProxiedImage(imageSrc, imageActionProxyEndpoint);
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
  isOpen: boolean;
  imageSrc: string;
  currentIndex: number;
  totalImages: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  imageActionProxyEndpoint?: string;
  preferImageActionProxy?: boolean;
}

const FullscreenOverlay: React.FC<FullscreenOverlayProps> = ({
  isOpen,
  imageSrc,
  currentIndex,
  totalImages,
  onPrevious,
  onNext,
  onClose,
  imageActionProxyEndpoint,
  preferImageActionProxy,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeDocumentRef = useRef<Document | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);
  const pressedBackdrop = useRef(false);
  const actionsId = useId();
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [activeAction, setActiveAction] = useState<ImageAction | null>(null);
  const [actionError, setActionError] = useState('');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent<HTMLDialogElement>) => {
      if (!isOpen || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        setContextMenuPosition(null);
        onPrevious();
      } else if (event.key === 'ArrowRight' && currentIndex < totalImages - 1) {
        event.preventDefault();
        setContextMenuPosition(null);
        onNext();
      }
    },
    [currentIndex, isOpen, onNext, onPrevious, totalImages]
  );

  useEffect(() => {
    const panel = actionsRef.current;
    if (!contextMenuPosition || !panel) return;
    // Native popovers provide light dismiss and Esc. Older browsers retain the
    // same button group, with the dialog's pointer/cancel handlers as fallback.
    if ('popover' in HTMLElement.prototype) panel.showPopover();
    panel.querySelector('button')?.focus();
    return () => {
      if ('popover' in HTMLElement.prototype) panel.hidePopover();
    };
  }, [contextMenuPosition]);

  const closeActions = () => {
    setContextMenuPosition(null);
    actionsButtonRef.current?.focus();
  };

  // The iframe is a separate document, so pointer events inside it never bubble
  // to React. Attach backdrop and context-menu handlers directly once loaded.
  const handleIframeLoad = useCallback(() => {
    if (!isOpen) return;
    const doc = iframeRef.current?.contentDocument;
    const image = doc?.querySelector('img');
    if (!doc || !image) {
      return;
    }
    iframeDocumentRef.current = doc;

    // Assign as a URL, never interpolate into HTML. Quotes and tags remain data.
    if (image.getAttribute('src') !== imageSrc) image.src = imageSrc;
    image.alt = `第 ${currentIndex + 1} 张图片，共 ${totalImages} 张`;
    doc.onkeydown = (event) => {
      // A close request in this separate document does not reach the parent
      // modal. Forward only iframe Esc through the dialog's cancel/close path.
      if (event.key === 'Escape') {
        const dialog = iframeRef.current?.closest('dialog');
        if (!dialog?.open) return;
        event.preventDefault();
        if (typeof dialog.requestClose === 'function') {
          dialog.requestClose();
        } else if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) {
          dialog.close();
        }
        return;
      }
      handleKeyDown(event);
    };

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
        x: Math.max(
          MENU_MARGIN,
          Math.min(iframeBounds.left + event.clientX, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
        ),
        y: Math.max(
          MENU_MARGIN,
          Math.min(iframeBounds.top + event.clientY, window.innerHeight - MENU_HEIGHT - MENU_MARGIN)
        ),
      });
    };
  }, [currentIndex, handleKeyDown, imageSrc, isOpen, onClose, totalImages]);

  useEffect(() => {
    if (!isOpen) return;
    handleIframeLoad();
    return () => {
      const doc = iframeDocumentRef.current;
      if (!doc) return;
      doc.onkeydown = null;
      doc.body.onclick = null;
      doc.body.oncontextmenu = null;
      iframeDocumentRef.current = null;
    };
  }, [handleIframeLoad, isOpen]);

  const handleImageAction = async (action: ImageAction) => {
    if (activeAction) {
      return;
    }

    setActiveAction(action);
    setActionError('');

    try {
      const sourceBlob = await fetchImageBlob(
        imageSrc,
        imageActionProxyEndpoint,
        preferImageActionProxy
      );
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

      closeActions();
    } catch (error) {
      console.error(`Failed to ${action} image`, error);
      setActionError(action === 'copy' ? '复制图片失败，请检查浏览器权限' : '保存图片失败');
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <ModalDialog
      className='fullscreen-overlay'
      isOpen={isOpen}
      onClose={onClose}
      aria-label='图片预览'
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        if (contextMenuPosition) {
          event.preventDefault();
          closeActions();
        }
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onClose();
        pressedBackdrop.current = false;
      }}
      onClick={(event) => {
        const target = event.target;
        if (
          target instanceof Element &&
          !target.closest('.fullscreen-overlay__context-menu, .fullscreen-overlay__actions-toggle')
        ) {
          setContextMenuPosition(null);
        }
      }}
    >
      <button
        type='button'
        className='fullscreen-overlay__close'
        autoFocus
        onClick={onClose}
        aria-label='关闭'
      >
        <svg
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth='2'
          stroke='currentColor'
        >
          <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
        </svg>
      </button>
      <button
        ref={actionsButtonRef}
        type='button'
        className='fullscreen-overlay__actions-toggle'
        aria-expanded={contextMenuPosition !== null}
        aria-controls={actionsId}
        onClick={(event) => {
          if (contextMenuPosition) {
            closeActions();
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          setActionError('');
          setContextMenuPosition({ x: bounds.left, y: bounds.bottom + MENU_MARGIN });
        }}
      >
        图片操作
      </button>
      {currentIndex > 0 && (
        <button
          type='button'
          className='fullscreen-overlay__nav fullscreen-overlay__nav--previous'
          onClick={() => {
            setContextMenuPosition(null);
            onPrevious();
          }}
          aria-label='上一张'
        >
          <svg
            aria-hidden='true'
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
          type='button'
          className='fullscreen-overlay__nav fullscreen-overlay__nav--next'
          onClick={() => {
            setContextMenuPosition(null);
            onNext();
          }}
          aria-label='下一张'
        >
          <svg
            aria-hidden='true'
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
        srcDoc={IFRAME_SRC_DOC}
        sandbox='allow-same-origin'
        onLoad={handleIframeLoad}
        title='图片预览'
      />
      {contextMenuPosition && (
        <div
          ref={actionsRef}
          id={actionsId}
          popover='auto'
          className='fullscreen-overlay__context-menu'
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            maxHeight: `calc(100dvh - ${contextMenuPosition.y + MENU_MARGIN}px)`,
          }}
          role='group'
          aria-label='图片操作'
          onToggle={(event) => {
            if (event.newState === 'closed') setContextMenuPosition(null);
          }}
        >
          <button
            type='button'
            disabled={activeAction !== null}
            onClick={() => void handleImageAction('copy')}
          >
            {activeAction === 'copy' ? '正在复制…' : '复制图片'}
          </button>
          <button
            type='button'
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
    </ModalDialog>
  );
};

export default FullscreenOverlay;
