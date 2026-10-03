import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import './CookieTips.css';

type MobilePlatform = 'ios' | 'android';

const detectMobilePlatform = (): MobilePlatform | null => {
  if (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  ) {
    return 'ios';
  }
  return /Android/i.test(navigator.userAgent) ? 'android' : null;
};

function CookieTips() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [detectedPlatform] = useState(detectMobilePlatform);
  const [platform, setPlatform] = useState<MobilePlatform>(detectedPlatform ?? 'ios');
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || pathname !== '/' || !dialog) return;

    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, pathname]);

  return (
    <>
      <button
        type='button'
        className='xhs-cookie-tips-link'
        aria-haspopup='dialog'
        onClick={() => setIsOpen(true)}
      >
        Tips · 手机如何获取小红书 Cookie？
      </button>
      <dialog
        ref={dialogRef}
        className='xhs-cookie-tips'
        aria-labelledby='xhs-cookie-tips-title'
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) {
            setIsOpen(false);
          }
        }}
      >
        <div className='xhs-cookie-tips-header'>
          <h2 id='xhs-cookie-tips-title'>手机获取小红书 Cookie</h2>
          <button type='button' aria-label='关闭提示' onClick={() => setIsOpen(false)}>
            ×
          </button>
        </div>
        <div className='xhs-cookie-tips-content'>
          {detectedPlatform === null && (
            <div className='xhs-cookie-tips-platforms' role='group' aria-label='选择手机系统'>
              <button
                type='button'
                aria-pressed={platform === 'ios'}
                onClick={() => setPlatform('ios')}
              >
                iOS / iPadOS
              </button>
              <button
                type='button'
                aria-pressed={platform === 'android'}
                onClick={() => setPlatform('android')}
              >
                Android
              </button>
            </div>
          )}
          <p>请先在对应浏览器中登录小红书网页版。仅在小红书 App 登录并不代表网页已登录。</p>
          {platform === 'ios' ? (
            <>
              <h3>iOS 方法一：Safari 扩展</h3>
              <ol>
                <li>
                  安装{' '}
                  <a
                    href='https://apps.apple.com/app/id6446215341'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Cookie-Editor（App Store）
                  </a>
                  ，在系统设置的 Safari → 扩展中启用，并允许访问小红书网站。
                </li>
                <li>在 Safari 打开小红书网页版并登录；如果一直引导打开 App，可尝试请求桌面网站。</li>
                <li>在小红书网页打开扩展，选择导出（Export）→ Header string，复制结果。</li>
              </ol>
              <p className='xhs-cookie-tips-note'>
                Safari 扩展可能无法导出全部 Cookie（例如 HttpOnly Cookie），获取后仍可能无法提取。
              </p>
              <h3>iOS 方法二：快捷指令</h3>
              <ol>
                <li>新建快捷指令，开启“在共享表单中显示”，接收类型选择“Safari 网页”。</li>
                <li>
                  添加“在网页上运行 JavaScript”，输入选择快捷指令输入，将默认脚本替换为：
                  <pre>
                    <code>completion(document.cookie);</code>
                  </pre>
                </li>
                <li>添加“拷贝到剪贴板”，使用上一步的结果。</li>
                <li>在已登录的小红书 Safari 网页中，通过分享菜单运行该快捷指令并允许执行。</li>
              </ol>
              <p className='xhs-cookie-tips-note'>
                此方法只能读取网页脚本可访问的 Cookie，无法读取 HttpOnly Cookie，也不能读取 App 登录态。
              </p>
            </>
          ) : (
            <>
              <h3>Android：Firefox 扩展</h3>
              <ol>
                <li>
                  在 Firefox 安卓版中安装{' '}
                  <a
                    href='https://addons.mozilla.org/zh-CN/firefox/addon/cookie-editor/'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Cookie-Editor 扩展
                  </a>
                  。
                </li>
                <li>在同一个 Firefox 中打开小红书网页版并登录；如被引导打开 App，可尝试桌面版网站。</li>
                <li>停留在小红书网页，从浏览器扩展菜单打开 Cookie-Editor，并授权访问该网站。</li>
                <li>选择导出（Export）→ Header string，复制结果。</li>
              </ol>
              <p className='xhs-cookie-tips-note'>
                扩展读取的是当前 Firefox 的 Cookie，无法读取其他浏览器或小红书 App 的登录态。
              </p>
            </>
          )}
          <h3>回到本页使用</h3>
          <p>
            点击“设置 Cookie”并粘贴保存。格式应为 <code>name=value; name2=value2</code>，
            不要添加 <code>Cookie:</code> 前缀，也不要使用 JSON 或 Netscape 格式。
            保存后刷新本页，再重新粘贴分享链接尝试。
          </p>
          <p className='xhs-cookie-tips-note'>
            Cookie 包含登录凭据，请勿分享给他人。获取 Cookie 不保证所有帖子都能提取。
          </p>
        </div>
      </dialog>
    </>
  );
}

export default CookieTips;
