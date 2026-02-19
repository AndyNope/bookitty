import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { BookkeepingProvider } from './store/BookkeepingContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <BookkeepingProvider>
        <App />
      </BookkeepingProvider>
    </BrowserRouter>
  </StrictMode>,
);
