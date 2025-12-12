import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Header from '@components/Header/Header';
import MainContent from '@components/MainContent/MainContent';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className='container'>
        <Header />
        <MainContent />
      </div>
    </Router>
  );
};

export default App;
