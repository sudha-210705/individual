// Intercept global fetch to append sessionStorage JWT token in the Authorization header.
// This isolates sessions per browser tab (preventing cookie overrides when testing multi-role apps).
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
      if (!options.headers.has('Authorization')) {
        options.headers.set('Authorization', `Bearer ${token}`);
      }
    } else if (Array.isArray(options.headers)) {
      if (!options.headers.some(([key]) => key.toLowerCase() === 'authorization')) {
        options.headers.push(['Authorization', `Bearer ${token}`]);
      }
    } else {
      if (!options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  return originalFetch(url, options);
};

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>,
)
