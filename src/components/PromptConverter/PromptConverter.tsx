import React, { useState } from 'react';
import { webuiToNai, naiToWebui } from '../../utils/promptConvert';
import './PromptConverter.css';

const PromptConverter = () => {
  const [webuiText, setWebuiText] = useState('');
  const [naiText, setNaiText] = useState('');

  const handleNai2WebuiClick = () => {
    if (naiText.trim()) {
      const converted = naiToWebui(naiText);
      setWebuiText(converted);
    }
  };

  const handleWebui2NaiClick = () => {
    if (webuiText.trim()) {
      const converted = webuiToNai(webuiText);
      setNaiText(converted);
    }
  };

  const handleClearClick = () => {
    setWebuiText('');
    setNaiText('');
  };

  return (
    <div className='prompt-converter'>
      <div className='converter-buttons'>
        <button className='convert-button webui2nai' onClick={handleWebui2NaiClick}>
          WebUI 转 NAI 格式
        </button>
        <button className='convert-button nai2webui' onClick={handleNai2WebuiClick}>
          NAI 转 WebUI 格式
        </button>
      </div>
      <div className='textareas-container'>
        <div className='textarea-wrapper webui'>
          <textarea
            name='webui'
            id='webui'
            placeholder='输入 WebUI 格式提示词'
            value={webuiText}
            onChange={(e) => setWebuiText(e.target.value)}
          ></textarea>
        </div>
        <div className='textarea-wrapper nai'>
          <textarea
            name='nai'
            id='nai'
            placeholder='输入 NAI 格式提示词'
            value={naiText}
            onChange={(e) => setNaiText(e.target.value)}
          ></textarea>
        </div>
      </div>
      <div className='clear-buttons'>
        <button className='clear-button' onClick={handleClearClick}>
          清空文本框
        </button>
      </div>
    </div>
  );
};

export default PromptConverter;
