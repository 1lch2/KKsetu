import { useRef, useImperativeHandle, forwardRef } from 'react';
import './CookieDialog.css';

export interface CookieDialogHandle {
  show: () => void;
  close: () => void;
}

interface CookieDialogProps {
  cookieValue: string;
  onCookieChange: (value: string) => void;
  onSave: () => void;
}

const CookieDialog = forwardRef<CookieDialogHandle, CookieDialogProps>(
  ({ cookieValue, onCookieChange, onSave }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useImperativeHandle(ref, () => ({
      show: () => dialogRef.current?.showModal(),
      close: () => dialogRef.current?.close(),
    }));

    return (
      <dialog ref={dialogRef} className='xhs-cookie-dialog'>
        <div className='xhs-cookie-dialog__content'>
          <h3>设置小红书 Cookie</h3>
          <textarea
            value={cookieValue}
            onChange={(e) => onCookieChange(e.target.value)}
            placeholder='粘贴你的小红书 Cookie...'
            rows={5}
          />
          <div className='xhs-cookie-dialog__actions'>
            <button onClick={() => dialogRef.current?.close()}>取消</button>
            <button onClick={onSave}>保存</button>
          </div>
        </div>
      </dialog>
    );
  }
);

export default CookieDialog;
