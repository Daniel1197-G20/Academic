import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import './styles/index.css';
import './styles/glass.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      const announceWaitingUpdate = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('studora:sw-update', { detail: registration }));
        }
      };

      announceWaitingUpdate();
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        installingWorker?.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') announceWaitingUpdate();
        });
      });

      registration.update().catch((error) => {
        console.warn('Studora service worker update check was unavailable:', error);
      });
    }).catch((error) => {
      console.error('Studora service worker registration failed:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
