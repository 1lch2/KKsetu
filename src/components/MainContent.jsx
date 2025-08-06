import React from 'react';
import '../styles/MainContent.css';

const MainContent = ({ children }) => {
  return (
    <main className="main-content">
      {children}
    </main>
  );
};

export default MainContent;
