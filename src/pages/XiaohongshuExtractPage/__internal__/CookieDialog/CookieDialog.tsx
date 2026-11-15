import { useId } from 'react';

import ModalDialog from '@components/ModalDialog/ModalDialog';

import './CookieDialog.css';

interface CookieDialogProps {
  cookieValue: string;
  onCookieChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  isOpen: boolean;
}

const CookieDialog = (props: CookieDialogProps) => {
  const titleId = useId();
  const fieldId = useId();

  return (
    <ModalDialog
      className='xhs-cookie-dialog'
      isOpen={props.isOpen}
      onClose={props.onClose}
      aria-labelledby={titleId}
    >
      <form
        className='xhs-cookie-dialog__content'
        onSubmit={(event) => {
          event.preventDefault();
          props.onSave();
        }}
      >
        <h2 id={titleId}>设置小红书 Cookie</h2>
        <label htmlFor={fieldId}>小红书 Cookie</label>
        <textarea
          id={fieldId}
          name='cookie'
          autoFocus
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
          value={props.cookieValue}
          onChange={(e) => props.onCookieChange(e.target.value)}
          placeholder='粘贴你的小红书 Cookie...'
          rows={5}
        />
        <div className='xhs-cookie-dialog__actions'>
          <button type='button' onClick={props.onClose}>
            取消
          </button>
          <button type='submit'>保存</button>
        </div>
      </form>
    </ModalDialog>
  );
};

export default CookieDialog;
