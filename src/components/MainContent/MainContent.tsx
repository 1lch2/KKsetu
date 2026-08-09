import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import TabBar from '@components/TabBar/TabBar';
import ExtractPage from '@/pages/ExtractPage/ExtractPage';
import ImageObfuscationPage from '@/pages/ImageObfuscationPage/ImageObfuscationPage';
import XiaohongshuExtractPage from '@/pages/XiaohongshuExtractPage/XiaohongshuExtractPage';
import TabPanel from '../TabPanel/TabPanel';

import './MainContent.css';

const queryClient = new QueryClient();

const MainContent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <main className='main-content'>
        <TabBar />
        <div className='tab-content'>
          <TabPanel path='/'>
            <XiaohongshuExtractPage />
          </TabPanel>
          <TabPanel path='/obfuscate'>
            <ImageObfuscationPage />
          </TabPanel>
          <TabPanel path='/extract'>
            <ExtractPage />
          </TabPanel>
        </div>
      </main>
    </QueryClientProvider>
  );
};

export default MainContent;
