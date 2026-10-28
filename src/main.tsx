// Guard against third-party Chrome extensions (e.g. requests.js / Urban VPN) trying to overwrite window.fetch
try {
  let originalFetch = window.fetch;
  const fetchDesc = Object.getOwnPropertyDescriptor(window, 'fetch') ||
                  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
  if (fetchDesc && (!fetchDesc.writable || (fetchDesc.get && !fetchDesc.set))) {
    Object.defineProperty(window, 'fetch', {
      get() { return originalFetch; },
      set(val) { originalFetch = val; },
      configurable: true,
      enumerable: true
    });
  }
} catch {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
