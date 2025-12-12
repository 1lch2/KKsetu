import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import TabBar from '@components/TabBar/TabBar';
// import UploadPage from '../UploadPage/UploadPage';
// import ImageGridPage from '../ImageGridPage/ImageGridPage';
import ExtractPage from '@components/ExtractPage/ExtractPage';
import PromptConverter from '@components/PromptConverter/PromptConverter';

import './MainContent.css';

const queryClient = new QueryClient();

const MainContent: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <main className='main-content'>
        <TabBar />
        <div className='tab-content'>
          <Routes>
            {/* <Route path='/' element={<ImageGridPage />} />
            <Route path='/upload' element={<UploadPage />} /> */}
            <Route path='/' element={<ExtractPage />} />
            <Route path='/convert' element={<PromptConverter />} />
            <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>
        </div>
      </main>
    </QueryClientProvider>
  );
};

export default MainContent;
