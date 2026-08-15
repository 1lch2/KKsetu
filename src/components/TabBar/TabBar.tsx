import React from 'react';
import { NavLink } from 'react-router-dom';
import './TabBar.css';

const TabBar: React.FC = () => {
  return (
    <div className='tab-bar'>
      <NavLink to='/' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        提取小红书原图
      </NavLink>
      <NavLink
        to='/obfuscate'
        className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
      >
        图片混淆
      </NavLink>
    </div>
  );
};

export default TabBar;
