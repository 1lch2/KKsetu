import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const HEADER_CLICK_LIMIT = 5;
const HEADER_CLICK_WINDOW_MS = 1000;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const clickCount = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const handleHeaderClick = () => {
    clickCount.current += 1;

    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
    }

    resetTimer.current = setTimeout(() => {
      clickCount.current = 0;
      resetTimer.current = null;
    }, HEADER_CLICK_WINDOW_MS);

    if (clickCount.current >= HEADER_CLICK_LIMIT) {
      clickCount.current = 0;
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
      navigate('/extract');
    }
  };

  return (
    <header className='header' onClick={handleHeaderClick}>
      <h1>KKSetu</h1>
    </header>
  );
};

export default Header;
