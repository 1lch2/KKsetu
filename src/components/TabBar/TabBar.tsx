import React from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/TabBar.css';

const TabBar: React.FC = () => {
  return (
    <div className='tab-bar'>
      {/* <NavLink to='/' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        浏览图片
      </NavLink>
      <NavLink to='/upload' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        上传图片
      </NavLink> */}
      <NavLink to='/' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        提取TXT
      </NavLink>
      <NavLink to='/convert' className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
        提示词格式转换
      </NavLink>
    </div>
  );
};

export default TabBar;
