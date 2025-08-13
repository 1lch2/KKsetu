import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Header from './components/Header';
import MainContent from './components/MainContent';
import './styles/global.css';

const App = () => {
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
