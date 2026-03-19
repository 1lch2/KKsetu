import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import TabBar from '@components/TabBar/TabBar';
import ExtractPage from '@components/ExtractPage/ExtractPage';
import XiaohongshuExtractPage from '../XiaohongshuExtractPage/XiaohongshuExtractPage';
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
            <ExtractPage />
          </TabPanel>
          <TabPanel path='/xiaohongshu'>
            <XiaohongshuExtractPage />
          </TabPanel>
        </div>
      </main>
    </QueryClientProvider>
  );
};

export default MainContent;
