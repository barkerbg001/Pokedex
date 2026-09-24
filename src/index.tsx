import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './components/App/App';
import reportWebVitals from './reportWebVitals';
import { sendToVercelAnalytics } from './vitals';
// Service worker registration lives in useServiceWorkerUpdate (used by App),
// not here, so it can be gated to production and report update availability

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals(sendToVercelAnalytics);
