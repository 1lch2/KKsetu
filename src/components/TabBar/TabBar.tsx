import React from 'react';
import { NavLink } from 'react-router-dom';
import './TabBar.css';

const TabBar: React.FC = () => {
  return (
    <nav className='tab-bar' aria-label='图片工具'>
      <NavLink to='/' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        小红书原图
      </NavLink>
      <NavLink
        to='/skland'
        className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
      >
        森空岛原图
      </NavLink>
      <NavLink
        to='/obfuscate'
        className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
      >
        图片混淆
      </NavLink>
    </nav>
  );
};

export default TabBar;
