import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '@descope/react-sdk';

import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider projectId='P31EeCcDPtwQGyi9wbZk4ZLKKE5a'>
      <App />
    </AuthProvider>
  </React.StrictMode>
);