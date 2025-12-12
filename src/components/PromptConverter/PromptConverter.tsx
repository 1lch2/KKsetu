import React, { useState } from 'react';
import { webuiToNai, naiToWebui } from '../../utils/promptConvert';
import './PromptConverter.css';

const PromptConverter = () => {
  const [webuiText, setWebuiText] = useState('');
  const [naiText, setNaiText] = useState('');

  const onWebuiPromptChange = (prompt: string) => {
    setWebuiText(prompt);
    if (prompt.trim()) {
      const converted = webuiToNai(prompt);
      setNaiText(converted);
    } else {
      setNaiText('');
    }
  };

  const onNaiPromptChange = (prompt: string) => {
    setNaiText(prompt);
    if (prompt.trim()) {
      const converted = naiToWebui(prompt);
      setWebuiText(converted);
    } else {
      setWebuiText('');
    }
  };

  const handleClearClick = () => {
    setWebuiText('');
    setNaiText('');
  };

  return (
    <div className='prompt-converter'>
      <div className='textareas-container'>
        <div className='textarea-wrapper webui'>
          <textarea
            name='webui'
            id='webui'
            placeholder='输入 WebUI 格式提示词'
            value={webuiText}
            onChange={(e) => onWebuiPromptChange(e.target.value)}
          ></textarea>
        </div>
        <div className='textarea-wrapper nai'>
          <textarea
            name='nai'
            id='nai'
            placeholder='输入 NAI 格式提示词'
            value={naiText}
            onChange={(e) => onNaiPromptChange(e.target.value)}
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
