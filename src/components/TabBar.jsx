import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/TabBar.css';

const TabBar = () => {
  return (
    <div className='tab-bar'>
      <NavLink to='/upload' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        上传提取
      </NavLink>
      <NavLink to='/browse' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        浏览管理
      </NavLink>
      <NavLink to='/pixiv' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        Pixiv镜像
      </NavLink>
    </div>
  );
};

export default TabBar;
