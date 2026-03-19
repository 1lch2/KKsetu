import { useLocation } from 'react-router-dom';
import React from 'react';

interface TabPanelProps {
  path: string;
  children: React.ReactNode;
}

const TabPanel = ({ path, children }: TabPanelProps) => {
  const location = useLocation();
  const isActive = location.pathname === path;

  return <div style={{ display: isActive ? 'contents' : 'none' }}>{children}</div>;
};

export default TabPanel;
