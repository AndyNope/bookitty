import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './store/AuthContext';
import { BookkeepingProvider } from './store/BookkeepingContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BookkeepingProvider>
          <App />
        </BookkeepingProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
