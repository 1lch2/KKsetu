import './CookieDialog.css';

interface CookieDialogProps {
  cookieValue: string;
  onCookieChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  isOpen: boolean;
}

const CookieDialog = (props: CookieDialogProps) => {
  return props.isOpen ? (
    <div className='xhs-cookie-dialog-backdrop' onClick={props.onClose}>
      <div className='xhs-cookie-dialog' onClick={(e) => e.stopPropagation()}>
        <div className='xhs-cookie-dialog__content'>
          <h3>设置小红书 Cookie</h3>
          <textarea
            value={props.cookieValue}
            onChange={(e) => props.onCookieChange(e.target.value)}
            placeholder='粘贴你的小红书 Cookie...'
            rows={5}
          />
          <div className='xhs-cookie-dialog__actions'>
            <button onClick={props.onClose}>取消</button>
            <button onClick={props.onSave}>保存</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

export default CookieDialog;
