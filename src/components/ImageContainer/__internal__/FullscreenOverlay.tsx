import React, { useEffect, useCallback, useMemo, useRef } from 'react';

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
      onClose();
    }
  };

  // The iframe is a separate document, so clicks inside it never bubble to the
  // parent's onClick. Attach a listener directly on its body once loaded, and
  // close whenever the click lands on the body itself rather than the image.
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    doc?.body.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    });
  }, [onClose]);

  // Render image inside a srcdoc iframe so that:
  // 1. The origin is about:blank — right-click "open in new tab" won't carry
  //    the current page as Referer, avoiding 403 from the image source server.
  // 2. The <img> element with a proper src inside an HTML document lets the
  //    browser correctly infer the file type for "Save As", instead of
  //    defaulting to .txt for data URLs in the parent page context.
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
    </div>
  );
};

export default FullscreenOverlay;
