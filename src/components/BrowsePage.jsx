import React from 'react';

const BrowsePage = () => {
  return (
    <div className="main-content-with-tabs">
      <div className="card">
        <h3>浏览管理</h3>
        <p>在线浏览功能开发中...</p>
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          color: 'var(--secondary-color)',
          fontStyle: 'italic'
        }}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth="1.5" 
            stroke="currentColor"
            style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
          </svg>
          <p>浏览和管理功能即将推出</p>
        </div>
      </div>
    </div>
  );
};

export default BrowsePage;
