import React from 'react';
import { ChangeEventHandler } from 'react';
import './UploadSection.css';

interface UploadSectionProps {
  onFileChange: ChangeEventHandler<HTMLInputElement>;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFileChange }) => {
  return (
    <div className='upload-section card'>
      <div className='instructions'>
        <h3>使用方法</h3>
        <ul>
          <li>下载群内的 txt 文件</li>
          <li>点击下方的按钮上传文件</li>
          <li>长按或右键点击图片进行保存</li>
        </ul>
      </div>
      <div className='file-selector'>
        <label htmlFor='file'>上传转码后的TXT</label>
        <input type='file' id='file' accept='.txt' multiple onChange={onFileChange} />
      </div>
      <p className='warning'>不要外传txt文件、转码后的图片或者这个脚本！！！</p>
    </div>
  );
};

export default UploadSection;
