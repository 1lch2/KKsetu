import { useEffect, useRef, type DialogHTMLAttributes } from 'react';

import './ModalDialog.css';

interface ModalDialogProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  'open' | 'onClose'
> {
  isOpen: boolean;
  onClose: () => void;
}

function ModalDialog({ isOpen, onClose, children, ...attributes }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    // Older browsers ignore closedby. Require both press and release outside,
    // so dragging a text selection onto the backdrop cannot dismiss the form.
    const outside = (event: PointerEvent) => {
      const bounds = dialog.getBoundingClientRect();
      return (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      );
    };
    let pressedOutside = false;
    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = outside(event);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && outside(event)) dialog.close();
      pressedOutside = false;
    };
    const needsLightDismiss = !('closedBy' in HTMLDialogElement.prototype);
    if (needsLightDismiss) {
      dialog.addEventListener('pointerdown', handlePointerDown);
      dialog.addEventListener('pointerup', handlePointerUp);
    }

    dialog.showModal();
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
      dialog.close();
    };
  }, [isOpen]);

  return (
    <dialog
      {...attributes}
      ref={dialogRef}
      closedby='any'
      onClose={(event) => {
        // Ignore a queued cleanup event if Strict Mode has already reopened it.
        if (!event.currentTarget.open) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export default ModalDialog;
