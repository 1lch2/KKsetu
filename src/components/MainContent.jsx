import { Routes, Route, Navigate } from 'react-router-dom';
import TabBar from './TabBar';
import UploadPage from './UploadPage';
import BrowsePage from './BrowsePage';
import '../styles/MainContent.css';

const MainContent = () => {
  return (
    <main className="main-content">
      <TabBar />
      <div className="tab-content">
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route 
            path="/upload" 
            element={<UploadPage />} 
          />
          <Route path="/browse" element={<BrowsePage />} />
        </Routes>
      </div>
    </main>
  );
};

export default MainContent;
